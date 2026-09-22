package com.coach.healthbridge

import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.work.WorkInfo
import androidx.work.WorkManager
import androidx.work.testing.TestListenableWorkerBuilder
import android.content.Context
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import kotlinx.coroutines.flow.first
import org.junit.After
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class BridgeSafetyTest {
    private val context: Context get() = ApplicationProvider.getApplicationContext()
    @After fun cleanSyntheticConfiguration() {
        BridgeStore(context).enabled = false
        scheduleSync(context, false)
        context.getSharedPreferences("bridge", Context.MODE_PRIVATE).edit().clear().commit()
    }
    @Test fun encryptedConfigurationAndInvalidEndpoints() {
        val store = BridgeStore(context)
        val token = "synthetic-test-credential-00000000000000"
        store.save("https://example.invalid/api/health-sync", token)
        assertEquals(token, store.config()!!.second)
        val stored = context.getSharedPreferences("bridge", Context.MODE_PRIVATE).getString("config", "")!!
        assertFalse(stored.contains(token))
        assertFalse(stored.contains("example.invalid"))
        for (url in listOf("http://example.invalid", "https://user:password@example.invalid", "https://example.invalid?token=secret")) {
            try { store.save(url, token); fail("Unsafe endpoint accepted") } catch (_: IllegalArgumentException) {}
        }
    }
    @Test fun disabledWorkerDoesNotAdvanceCheckpointAndCancellationIsPersisted() = runBlocking {
        val store = BridgeStore(context)
        store.checkpoint = "2026-09-22T09:00:00Z"
        store.enabled = false
        val worker = TestListenableWorkerBuilder<HealthSyncWorker>(context).build()
        assertEquals(androidx.work.ListenableWorker.Result.success(), worker.doWork())
        assertEquals("2026-09-22T09:00:00Z", store.checkpoint)
        scheduleSync(context, true)
        withTimeout(10000) { WorkManager.getInstance(context).getWorkInfosForUniqueWorkFlow("coach-health-sync").first { it.isNotEmpty() } }
        scheduleSync(context, false)
        val jobs = withTimeout(10000) { WorkManager.getInstance(context).getWorkInfosForUniqueWorkFlow("coach-health-sync").first { jobs -> jobs.all { it.state.isFinished } } }
        assertTrue(jobs.all { it.state == WorkInfo.State.CANCELLED || it.state.isFinished })
    }
}
