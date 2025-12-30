// MainActivity.java
package com.yourpackage.app;

import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.webkit.WebSettings;
import android.webkit.WebViewClient;
import androidx.appcompat.app.AppCompatActivity;
import com.google.firebase.messaging.FirebaseMessaging;
import android.util.Log;

public class MainActivity extends AppCompatActivity {
    private WebView webView;
    private String fcmToken = "";
    private static final String TAG = "MainActivity";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        webView = findViewById(R.id.webview);
        
        // Enable JavaScript
        WebSettings webSettings = webView.getSettings();
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(true);
        
        // Add JavaScript interface
        webView.addJavascriptInterface(new WebAppInterface(), "AndroidBridge");
        
        // Get FCM token
        FirebaseMessaging.getInstance().getToken()
            .addOnCompleteListener(task -> {
                if (task.isSuccessful()) {
                    fcmToken = task.getResult();
                    Log.d(TAG, "FCM Token: " + fcmToken);
                    
                    // Inject token into WebView after page loads
                    webView.post(() -> {
                        String js = "window.AndroidFCMToken = '" + fcmToken + "';";
                        webView.evaluateJavascript(js, null);
                        Log.d(TAG, "Token injected into WebView");
                    });
                } else {
                    Log.e(TAG, "Failed to get FCM token", task.getException());
                }
            });
        
        // Load your website
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                // Inject token when page loads
                if (!fcmToken.isEmpty()) {
                    String js = "window.AndroidFCMToken = '" + fcmToken + "';";
                    webView.evaluateJavascript(js, null);
                    Log.d(TAG, "Token re-injected after page load");
                }
            }
        });
        
        webView.loadUrl("https://csenotif.netlify.app");
    }

    // JavaScript Interface
    public class WebAppInterface {
        @JavascriptInterface
        public String getFCMToken() {
            Log.d(TAG, "WebView requested FCM token: " + fcmToken);
            return fcmToken;
        }
        
        @JavascriptInterface
        public void log(String message) {
            Log.d(TAG, "WebView Log: " + message);
        }
    }
    
    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
