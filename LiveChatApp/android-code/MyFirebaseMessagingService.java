// MyFirebaseMessagingService.java
package com.yourpackage.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.os.Build;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import me.leolin.shortcutbadger.ShortcutBadger;

public class MyFirebaseMessagingService extends FirebaseMessagingService {
    private static final String TAG = "FCMService";
    private static final String CHANNEL_ID = "student_messages";

    @Override
    public void onNewToken(String token) {
        super.onNewToken(token);
        Log.d(TAG, "New FCM Token: " + token);
        // You can send this to your backend if needed
    }

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);
        Log.d(TAG, "Message received from: " + remoteMessage.getFrom());

        // Get notification data
        String title = remoteMessage.getNotification() != null 
            ? remoteMessage.getNotification().getTitle() 
            : "New Message";
            
        String body = remoteMessage.getNotification() != null 
            ? remoteMessage.getNotification().getBody() 
            : "";

        // Get badge count from data payload
        int badgeCount = 1;
        if (remoteMessage.getData().containsKey("badgeCount")) {
            try {
                badgeCount = Integer.parseInt(remoteMessage.getData().get("badgeCount"));
            } catch (NumberFormatException e) {
                Log.e(TAG, "Invalid badge count", e);
            }
        }

        Log.d(TAG, "Badge Count: " + badgeCount);

        // Show notification
        showNotification(title, body, badgeCount);
    }

    private void showNotification(String title, String body, int badgeCount) {
        // Create notification channel (Android 8.0+)
        createNotificationChannel();

        // Intent to open app
        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, 
            0, 
            intent,
            PendingIntent.FLAG_ONE_SHOT | PendingIntent.FLAG_IMMUTABLE
        );

        // Build notification
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification) // Make sure you have this icon
            .setContentTitle(title)
            .setContentText(body)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setNumber(badgeCount); // This shows badge on notification

        // Show notification
        NotificationManager notificationManager = 
            (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        notificationManager.notify(0, builder.build());

        // Set badge count on app icon
        ShortcutBadger.applyCount(getApplicationContext(), badgeCount);
        Log.d(TAG, "Badge count set to: " + badgeCount);
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Student Messages",
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Notifications for student messages from HOD");
            
            NotificationManager manager = getSystemService(NotificationManager.class);
            manager.createNotificationChannel(channel);
        }
    }
}
