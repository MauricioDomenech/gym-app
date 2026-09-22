package com.coach.healthbridge

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import org.json.JSONObject

class BridgeStore(context: Context) {
    private val prefs = context.getSharedPreferences("bridge", Context.MODE_PRIVATE)
    private fun key(): SecretKey {
        val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        return (store.getKey("coach-health", null) as? SecretKey) ?: KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore").run {
            init(KeyGenParameterSpec.Builder("coach-health", KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build())
            generateKey()
        }
    }
    fun config(): Pair<String, String>? {
        val raw = prefs.getString("config", null) ?: return null
        val parts = raw.split(":")
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, Base64.decode(parts[0], Base64.NO_WRAP)))
        val json = JSONObject(String(cipher.doFinal(Base64.decode(parts[1], Base64.NO_WRAP)), Charsets.UTF_8))
        return json.getString("endpoint") to json.getString("token")
    }
    fun save(endpoint: String, token: String) {
        val uri = java.net.URI(endpoint)
        require(uri.scheme == "https" && !uri.host.isNullOrBlank() && uri.userInfo == null && uri.fragment == null && uri.query == null) { "Usá una URL HTTPS sin credenciales ni parámetros." }
        require(token.length in 32..512 && token.none { it.isWhitespace() }) { "La clave debe tener entre 32 y 512 caracteres, sin espacios." }
        val cipher = Cipher.getInstance("AES/GCM/NoPadding").apply { init(Cipher.ENCRYPT_MODE, key()) }
        val bytes = cipher.doFinal(JSONObject().put("endpoint", endpoint).put("token", token).toString().toByteArray(Charsets.UTF_8))
        prefs.edit().putString("config", Base64.encodeToString(cipher.iv, Base64.NO_WRAP) + ":" + Base64.encodeToString(bytes, Base64.NO_WRAP))
            .remove("checkpoint").commit()
    }
    var enabled: Boolean
        get() = prefs.getBoolean("enabled", false)
        set(value) { prefs.edit().putBoolean("enabled", value).commit() }
    var checkpoint: String?
        get() = prefs.getString("checkpoint", null)
        set(value) { prefs.edit().putString("checkpoint", value).commit() }
    var status: String
        get() = prefs.getString("status", "Todavía no sincronizado")!!
        set(value) { prefs.edit().putString("status", value).apply() }
}
