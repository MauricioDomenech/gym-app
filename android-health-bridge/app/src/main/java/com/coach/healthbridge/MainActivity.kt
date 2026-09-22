package com.coach.healthbridge

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.SystemBarStyle
import androidx.activity.enableEdgeToEdge
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.contentDescription
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.HealthConnectFeatures
import androidx.health.connect.client.PermissionController
import kotlinx.coroutines.launch
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.repeatOnLifecycle

class MainActivity : ComponentActivity() {
    @OptIn(ExperimentalMaterial3ExpressiveApi::class)
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge(statusBarStyle = SystemBarStyle.light(android.graphics.Color.TRANSPARENT, android.graphics.Color.TRANSPARENT), navigationBarStyle = SystemBarStyle.light(android.graphics.Color.TRANSPARENT, android.graphics.Color.TRANSPARENT))
        setContent {
            MaterialExpressiveTheme {
                Surface(Modifier.fillMaxSize()) { BridgeScreen() }
            }
        }
    }
    @OptIn(ExperimentalMaterial3ExpressiveApi::class)
    @Composable private fun BridgeScreen() {
        val store = remember { BridgeStore(this) }
        var endpoint by remember { mutableStateOf(runCatching { store.config()?.first }.getOrNull() ?: "") }
        var token by remember { mutableStateOf("") }
        var enabled by remember { mutableStateOf(store.enabled) }
        var status by remember { mutableStateOf(store.status) }
        var notice by remember { mutableStateOf("") }
        var permissions by remember { mutableStateOf("Comprobando permisos…") }
        val scope = rememberCoroutineScope()
        suspend fun refresh() {
            status = store.status
            permissions = runCatching {
                if (HealthConnectClient.getSdkStatus(this@MainActivity) != HealthConnectClient.SDK_AVAILABLE) "Instalá o actualizá Salud conectada."
                else {
                    val client = HealthConnectClient.getOrCreate(this@MainActivity)
                    val granted = client.permissionController.getGrantedPermissions()
                    when {
                        !granted.containsAll(readPermissions) -> "Falta permitir lectura de ejercicios y pulsaciones."
                        backgroundPermission !in granted -> "Falta acceso en segundo plano: todavía no puede funcionar automáticamente."
                        else -> "Permisos listos para la sincronización automática."
                    }
                }
            }.getOrDefault("No pude comprobar los permisos.")
        }
        val launcher = rememberLauncherForActivityResult(PermissionController.createRequestPermissionResultContract()) { scope.launch { refresh() } }
        LaunchedEffect(Unit) { lifecycle.repeatOnLifecycle(Lifecycle.State.STARTED) { while (true) { refresh(); kotlinx.coroutines.delay(5000) } } }
        Column(Modifier.safeDrawingPadding().verticalScroll(rememberScrollState()).padding(24.dp), verticalArrangement = Arrangement.spacedBy(20.dp)) {
            Text("COACH / SALUD", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.primary)
            Text("Tu actividad,\nsin pasos extra.", style = MaterialTheme.typography.headlineLarge)
            Text("Tus sesiones y pulsaciones llegan a Coach después de entrenar. No es seguimiento en vivo.")
            ElevatedCard {
                Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text(if (enabled) "Automatismo habilitado" else "Conectemos tu salud", style = MaterialTheme.typography.titleLarge)
                    Text(status)
                    Text(permissions, style = MaterialTheme.typography.bodyMedium)
                }
            }
            Text("1 · Conexión privada", style = MaterialTheme.typography.titleMedium)
            OutlinedTextField(endpoint, { endpoint = it }, Modifier.fillMaxWidth(), label = { Text("URL HTTPS de Coach") }, singleLine = true, enabled = !enabled)
            OutlinedTextField(token, { token = it }, Modifier.fillMaxWidth(), label = { Text("Clave de sincronización") }, singleLine = true, visualTransformation = PasswordVisualTransformation(), enabled = !enabled)
            FilledTonalButton(onClick = {
                runCatching { store.save(endpoint.trim(), token.trim()) }.onSuccess { token = ""; notice = "Conexión guardada en este móvil." }
                    .onFailure { notice = if (it is IllegalArgumentException) it.message ?: "Configuración inválida." else "No pude guardar la conexión." }
            }, enabled = !enabled && token.isNotBlank()) { Text("Guardar conexión") }
            if (notice.isNotEmpty()) Text(notice, color = MaterialTheme.colorScheme.primary)
            Text("2 · Permisos de lectura", style = MaterialTheme.typography.titleMedium)
            Text("Sólo ejercicios y frecuencia cardíaca. No modifico Samsung Health ni accedo a tu contraseña Samsung.")
            Button(onClick = {
                if (HealthConnectClient.getSdkStatus(this@MainActivity) != HealthConnectClient.SDK_AVAILABLE) {
                    runCatching { startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=com.google.android.apps.healthdata"))) }
                } else {
                    val client = HealthConnectClient.getOrCreate(this@MainActivity)
                    val backgroundAvailable = client.features.getFeatureStatus(HealthConnectFeatures.FEATURE_READ_HEALTH_DATA_IN_BACKGROUND) == HealthConnectFeatures.FEATURE_STATUS_AVAILABLE
                    launcher.launch(if (backgroundAvailable) readPermissions + backgroundPermission else readPermissions)
                    if (!backgroundAvailable) notice = "Esta versión de Salud conectada no admite lectura en segundo plano. Actualizala para usar el automatismo."
                }
            }, shapes = ButtonDefaults.shapes()) { Text("Revisar permisos") }
            HorizontalDivider()
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("Sincronización automática", Modifier.weight(1f), style = MaterialTheme.typography.titleMedium)
                Switch(enabled, modifier = Modifier.semantics { contentDescription = "Sincronización automática" }, onCheckedChange = { next -> scope.launch {
                    if (next) {
                        val ready = runCatching {
                            store.config() != null && HealthConnectClient.getOrCreate(this@MainActivity).permissionController.getGrantedPermissions().containsAll(readPermissions + backgroundPermission)
                        }.getOrDefault(false)
                        if (!ready) { notice = "Primero guardá la conexión y concedé todos los permisos, incluido segundo plano."; return@launch }
                    }
                    store.enabled = next
                    enabled = next
                    scheduleSync(this@MainActivity, next)
                    store.status = if (next) "Programada. Android decide cuándo ejecutarla según red y batería." else "Sincronización deshabilitada."
                    status = store.status
                } })
            }
            Text("Android programa las revisiones aproximadamente cada 15 minutos y puede demorarlas por ahorro de batería. No necesitás dejar esta app abierta.", style = MaterialTheme.typography.bodySmall)
            Text("Privacidad: los datos viajan cifrados sólo al endpoint que configures. Clave cifrada en el dispositivo y excluida del backup. Desactivar detiene nuevos envíos; no borra datos ya recibidos por Coach.", style = MaterialTheme.typography.bodySmall)
        }
    }
}
