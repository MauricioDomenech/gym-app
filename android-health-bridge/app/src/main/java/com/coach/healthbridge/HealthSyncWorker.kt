package com.coach.healthbridge

import android.content.Context
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.HealthConnectFeatures
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.HeartRateRecord
import androidx.health.connect.client.records.Record
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import androidx.work.*
import java.net.URL
import java.time.Instant
import java.time.temporal.ChronoUnit
import java.util.concurrent.TimeUnit
import javax.net.ssl.HttpsURLConnection
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import org.json.JSONArray
import org.json.JSONObject

val readPermissions = setOf(HealthPermission.getReadPermission(ExerciseSessionRecord::class), HealthPermission.getReadPermission(HeartRateRecord::class))
const val backgroundPermission = "android.permission.health.READ_HEALTH_DATA_IN_BACKGROUND"
private const val WORK_NAME = "coach-health-sync"
private val syncLock = Mutex()

fun scheduleSync(context: Context, enabled: Boolean) {
    val manager = WorkManager.getInstance(context)
    if (!enabled) { manager.cancelUniqueWork(WORK_NAME); return }
    manager.enqueueUniquePeriodicWork(WORK_NAME, ExistingPeriodicWorkPolicy.UPDATE,
        PeriodicWorkRequestBuilder<HealthSyncWorker>(15, TimeUnit.MINUTES)
            .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS).build())
}

class HealthSyncWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result = syncLock.withLock { withContext(Dispatchers.IO) {
        val store = BridgeStore(applicationContext)
        if (!store.enabled) return@withContext Result.success()
        try {
            if (HealthConnectClient.getSdkStatus(applicationContext) != HealthConnectClient.SDK_AVAILABLE) {
                store.status = "Salud conectada no está disponible o necesita actualizarse."
                return@withContext Result.failure()
            }
            val client = HealthConnectClient.getOrCreate(applicationContext)
            val granted = client.permissionController.getGrantedPermissions()
            if (!granted.containsAll(readPermissions) || backgroundPermission !in granted) {
                store.status = "Faltan permisos de lectura o de acceso en segundo plano. Abrí Coach · Salud."
                return@withContext Result.failure()
            }
            val config = store.config() ?: run {
                store.status = "Falta configurar la conexión con Coach."
                return@withContext Result.failure()
            }
            val end = Instant.now()
            val start = store.checkpoint?.let { Instant.parse(it).minus(6, ChronoUnit.HOURS) }
                ?: end.minus(30, ChronoUnit.DAYS)
            var count = 0
            val batch = mutableListOf<JSONObject>()
            suspend fun flush() {
                if (batch.isEmpty()) return
                if (!store.enabled || isStopped) throw InterruptedException()
                post(config, batch)
                count += batch.size
                batch.clear()
            }
            suspend fun add(record: JSONObject) {
                val bytes = record.toString().toByteArray(Charsets.UTF_8).size
                require(bytes < 900_000) { "record_size" }
                if (batch.size >= 200 || batch.sumOf { it.toString().toByteArray(Charsets.UTF_8).size + 1 } + bytes > 950_000) flush()
                batch.add(record)
            }
            var token: String? = null
            do {
                val page = client.readRecords(ReadRecordsRequest(ExerciseSessionRecord::class, TimeRangeFilter.between(start, end), pageSize = 200, pageToken = token))
                for (r in page.records) add(base(r, "exercise_session", r.startTime, r.endTime, r.startZoneOffset?.totalSeconds, r.endZoneOffset?.totalSeconds)
                    .put("data", JSONObject().put("exerciseType", r.exerciseType).put("title", r.title ?: JSONObject.NULL).put("notes", r.notes ?: JSONObject.NULL)))
                token = page.pageToken
            } while (token != null)
            do {
                val page = client.readRecords(ReadRecordsRequest(HeartRateRecord::class, TimeRangeFilter.between(start, end), pageSize = 100, pageToken = token))
                for (r in page.records) {
                    // Stable minute buckets bound payload size without dropping samples. Deletions need reconciliation (README).
                    for ((minute, samples) in r.samples.groupBy { it.time.epochSecond / 60 }.toSortedMap()) {
                        samples.sortedBy { it.time }.chunked(5000).forEachIndexed { index, chunk ->
                            val samplesJson = JSONArray()
                            chunk.forEach { samplesJson.put(JSONObject().put("time", it.time.toString()).put("bpm", it.beatsPerMinute)) }
                            add(base(r, "heart_rate", r.startTime, r.endTime, r.startZoneOffset?.totalSeconds, r.endZoneOffset?.totalSeconds)
                                .put("sourceId", r.metadata.id + "#minute-" + minute + "-" + index)
                                .put("data", JSONObject().put("samples", samplesJson)))
                        }
                    }
                }
                token = page.pageToken
            } while (token != null)
            flush()
            if (!store.enabled || isStopped) throw InterruptedException()
            store.checkpoint = end.toString()
            store.status = "Última sincronización: ${java.time.ZonedDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM HH:mm"))} · $count registros revisados"
            Result.success()
        } catch (e: kotlinx.coroutines.CancellationException) { throw e
        } catch (e: SecurityException) {
            store.status = "Permisos revocados. Abrí Coach · Salud para revisarlos."
            Result.failure()
        } catch (e: InterruptedException) { Result.success()
        } catch (e: PermanentSyncException) {
            store.status = e.safeMessage
            Result.failure()
        } catch (e: Exception) {
            store.status = "No se pudo sincronizar. Reintentaré automáticamente; el progreso no se adelantó."
            Result.retry()
        }
    } }
}

private class PermanentSyncException(val safeMessage: String) : Exception()
private fun base(r: Record, type: String, start: Instant, end: Instant, startOffset: Int?, endOffset: Int?) = JSONObject()
    .put("recordType", type).put("sourceId", r.metadata.id).put("sourcePackage", r.metadata.dataOrigin.packageName)
    .put("lastModifiedTime", r.metadata.lastModifiedTime.toString()).put("startTime", start.toString()).put("endTime", end.toString())
    .put("startZoneOffsetSeconds", startOffset ?: JSONObject.NULL).put("endZoneOffsetSeconds", endOffset ?: JSONObject.NULL)

private fun post(config: Pair<String, String>, records: List<JSONObject>) {
    val url = URL(config.first)
    require(url.protocol == "https")
    val conn = url.openConnection() as HttpsURLConnection
    try {
        conn.instanceFollowRedirects = false
        conn.requestMethod = "POST"
        conn.connectTimeout = 20_000
        conn.readTimeout = 30_000
        conn.setRequestProperty("Authorization", "Bearer ${config.second}")
        conn.setRequestProperty("Content-Type", "application/json")
        conn.doOutput = true
        val bytes = JSONObject().put("schemaVersion", 1).put("records", JSONArray(records)).toString().toByteArray(Charsets.UTF_8)
        require(bytes.size <= 1_000_000)
        conn.setFixedLengthStreamingMode(bytes.size)
        conn.outputStream.use { it.write(bytes) }
        when (conn.responseCode) {
            200 -> {
                val response = conn.inputStream.use { input ->
                    val output = java.io.ByteArrayOutputStream()
                    val buffer = ByteArray(1024)
                    while (output.size() <= 4096) {
                        val size = input.read(buffer, 0, minOf(buffer.size, 4097 - output.size()))
                        if (size < 0) break
                        output.write(buffer, 0, size)
                    }
                    output.toByteArray()
                }
                check(response.size <= 4096 && JSONObject(String(response, Charsets.UTF_8)).getInt("accepted") == records.size)
            }
            401, 403 -> throw PermanentSyncException("Coach rechazó la clave. Revisá la configuración.")
            400, 413 -> throw PermanentSyncException("Coach rechazó el formato de datos. Hace falta revisar la integración.")
            in 300..399 -> throw PermanentSyncException("El endpoint redirige. Configurá su URL HTTPS final.")
            else -> throw java.io.IOException("sync_failed")
        }
    } finally { conn.disconnect() }
}
