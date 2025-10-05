/**
 * Day-Zen Notification Scheduler
 *
 * This module handles all regular (non-intrusive) notifications using `expo-notifications`.
 * Intrusive alarms are managed separately by `intrusiveAlarmManager.js`.
 *
 * Core Logic:
 * - Consolidates multiple reminders into single notifications to avoid clutter.
 * - Groups reminders by type (daily, weekly, monthly, one-time) and scheduled time.
 * - Uses dedicated Android channels for each notification type for better user control.
 */

import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// Initialize notification channels and categories for proper categorization
export const initializeNotificationChannels = async () => {
  if (Platform.OS === "android") {
    try {
      // Create notification channels for different types
      await Notifications.setNotificationChannelAsync("daily-reminders", {
        name: "Daily Reminders",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#4CAF50",
        sound: true,
        enableVibrate: true,
        enableLights: true,
        showBadge: true,
        description: "Daily recurring reminder notifications",
      });

      await Notifications.setNotificationChannelAsync("weekly-reminders", {
        name: "Weekly Reminders",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 300, 300, 300],
        lightColor: "#2196F3",
        sound: true,
        enableVibrate: true,
        enableLights: true,
        showBadge: true,
        description: "Weekly recurring reminder notifications",
      });

      await Notifications.setNotificationChannelAsync("monthly-reminders", {
        name: "Monthly Reminders",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 400, 400, 400],
        lightColor: "#9C27B0",
        sound: true,
        enableVibrate: true,
        enableLights: true,
        showBadge: true,
        description: "Monthly recurring reminder notifications",
      });

      await Notifications.setNotificationChannelAsync("one-time-reminders", {
        name: "One-time Reminders",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 200, 200, 200],
        lightColor: "#FF9800",
        sound: true,
        enableVibrate: true,
        enableLights: true,
        showBadge: true,
        description: "Non-recurring reminder notifications",
      });

      // Regular notifications do not need categories since they don't have interactive actions
      // Only intrusive alarms (handled by expo-alarm-module) have interactive features
      // Tapping the notification will automatically open the app

      console.log(
        "Notification channels and categories initialized successfully"
      );
    } catch (error) {
      console.error("Error initializing notification channels:", error);
    }
  } else {
    console.log("iOS platform detected - notification channels are not needed");
  }
};

// Group reminders by type and time for consolidated notifications
const groupRemindersByTimeAndType = (reminders) => {
  const groups = {
    daily: {},
    weekly: {},
    monthly: {},
    oneTime: {},
  };

  reminders.forEach((reminder) => {
    if (reminder.recurring === "daily") {
      let timeKey;
      if (reminder.timer) {
        const reminderTime = new Date(reminder.timer);
        timeKey = `${reminderTime.getHours()}:${reminderTime.getMinutes()}`;
      } else {
        timeKey = "9:0"; // Default 9 AM for daily reminders without specific time
      }

      if (!groups.daily[timeKey]) {
        groups.daily[timeKey] = [];
      }
      groups.daily[timeKey].push(reminder);
    } else if (reminder.recurring === "weekly") {
      let reminderTime;
      if (reminder.timer) {
        reminderTime = new Date(reminder.timer);
      } else {
        // Default to Sunday 9 AM if no timer specified
        reminderTime = new Date();
        // Set to next Sunday (0) at 9 AM
        const dayOfWeek = reminderTime.getDay();
        const daysUntilSunday = (7 - dayOfWeek) % 7;
        reminderTime.setDate(reminderTime.getDate() + daysUntilSunday);
        reminderTime.setHours(9, 0, 0, 0);
      }
      const timeKey = `${reminderTime.getDay()}-${reminderTime.getHours()}:${reminderTime.getMinutes()}`;

      if (!groups.weekly[timeKey]) {
        groups.weekly[timeKey] = [];
      }
      groups.weekly[timeKey].push(reminder);
    } else if (reminder.recurring === "monthly") {
      let reminderTime;
      if (reminder.timer) {
        reminderTime = new Date(reminder.timer);
      } else {
        // Default to 1st of month 9 AM if no timer specified
        reminderTime = new Date();
        reminderTime.setDate(1);
        reminderTime.setHours(9, 0, 0, 0);
      }
      const timeKey = `${reminderTime.getDate()}-${reminderTime.getHours()}:${reminderTime.getMinutes()}`;

      if (!groups.monthly[timeKey]) {
        groups.monthly[timeKey] = [];
      }
      groups.monthly[timeKey].push(reminder);
    } else if (reminder.timer) {
      // One-time reminders with specific timer
      const reminderTime = new Date(reminder.timer);
      const now = new Date();

      // Only include future one-time reminders
      if (reminderTime > now) {
        const timeKey = reminderTime.toISOString();
        if (!groups.oneTime[timeKey]) {
          groups.oneTime[timeKey] = [];
        }
        groups.oneTime[timeKey].push(reminder);
      } else {
        console.log(
          `Skipping past one-time reminder: "${reminder.message}" scheduled for ${reminderTime.toLocaleString()}`
        );
      }
    }
  });

  return groups;
};

const createConsolidatedContent = (reminders, type) => {
  const baseContent = {
    title: `${getTypeEmoji(type)} ${getTypeTitle(type)}`,
    body: reminders[0].message,
    data: {
      reminderId: reminders[0].id,
      type: "single",
    },
  };

  if (reminders.length === 1) {
    return baseContent;
  }

  const reminderList = reminders
    .map((r, index) => `${index + 1}. ${r.message}`)
    .join("\n");

  return {
    title: `${getTypeEmoji(type)} ${reminders.length} ${getTypeTitle(type)}s`,
    body: reminderList,
    data: {
      reminderIds: reminders.map((r) => r.id),
      type: "consolidated",
      count: reminders.length,
    },
  };
};

const getTypeEmoji = (type) => {
  switch (type) {
    case "daily":
      return "📅";
    case "weekly":
      return "📆";
    case "monthly":
      return "🗓️";
    default:
      return "⏰";
  }
};

const getTypeTitle = (type) => {
  switch (type) {
    case "daily":
      return "Daily Reminder";
    case "weekly":
      return "Weekly Reminder";
    case "monthly":
      return "Monthly Reminder";
    default:
      return "Reminder";
  }
};

const getChannelId = (type) => {
  switch (type) {
    case "daily":
      return "daily-reminders";
    case "weekly":
      return "weekly-reminders";
    case "monthly":
      return "monthly-reminders";
    default:
      return "one-time-reminders";
  }
};

const getCategoryId = (type) => {
  // Regular notifications don't need categories since they don't have interactive actions
  // Tapping the notification will automatically open the app
  return undefined;
};

// Schedule a consolidated notification for a group of reminders
const scheduleConsolidatedNotification = async (reminders, timeKey, type) => {
  console.log(
    `Scheduling consolidated ${type} notification for ${reminders.length} reminders at ${timeKey}`
  );

  try {
    let trigger;
    const content = createConsolidatedContent(reminders, type);

    // Add channel information
    const channelId = getChannelId(type);
    content.channelId = channelId;
    content.sound = "default";
    content.priority = Notifications.AndroidNotificationPriority.HIGH;
    content.badge = 1;

    console.log(`Setting channelId: ${channelId} for ${type} notification`);

    if (type === "daily") {
      const [hour, minute] = timeKey.split(":").map(Number);
      trigger = {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      };
    } else if (type === "weekly") {
      const [weekday, time] = timeKey.split("-");
      const [hour, minute] = time.split(":").map(Number);
      trigger = {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: (parseInt(weekday) + 1) % 7 || 1, // Convert 0-6 to 1-7, Sunday = 1
        hour,
        minute,
      };
    } else if (type === "monthly") {
      const [day, time] = timeKey.split("-");
      const [hour, minute] = time.split(":").map(Number);
      trigger = {
        type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
        day: parseInt(day),
        hour,
        minute,
      };
    } else {
      // One-time notification
      const reminderTime = new Date(timeKey);
      if (reminderTime <= new Date()) {
        console.log("One-time reminder is in the past, skipping");
        return null;
      }
      trigger = {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminderTime,
      };
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content,
      trigger,
    });

    console.log(
      `Consolidated ${type} notification scheduled successfully with ID: ${notificationId}`
    );
    return notificationId;
  } catch (error) {
    console.error(`Error scheduling consolidated ${type} notification:`, error);
    return null;
  }
};

// Cancel regular notifications for a specific reminder
export const cancelRegularNotification = async (reminderId) => {
  console.log(`Cancelling notifications for reminder ID: ${reminderId}`);
  try {
    const scheduledNotifications =
      await Notifications.getAllScheduledNotificationsAsync();
    let cancelledCount = 0;

    for (const notif of scheduledNotifications) {
      const data = notif.content.data;

      // Check if this notification contains the specific reminder
      if (
        data?.reminderId === reminderId ||
        (data?.reminderIds && data.reminderIds.includes(reminderId))
      ) {
        await Notifications.cancelScheduledNotificationAsync(notif.identifier);
        cancelledCount++;

        // If this was a consolidated notification, we need to reschedule without this reminder
        if (
          data?.type === "consolidated" &&
          data.reminderIds &&
          data.reminderIds.length > 1
        ) {
          console.log(
            "Rescheduling consolidated notification without removed reminder"
          );
          // This will be handled in the main reschedule function
        }
      }
    }

    console.log(
      `Cancelled ${cancelledCount} notifications for reminder ID: ${reminderId}`
    );
    return true;
  } catch (error) {
    console.error("Error canceling notification:", error);
    return false;
  }
};

// Main function to schedule all regular notifications (daily/weekly/monthly/one-time) with consolidation
export const scheduleAllRegularNotifications = async (reminders) => {
  console.log("Rescheduling all notifications with consolidation...");

  try {
    // Initialize notification channels first
    await initializeNotificationChannels();

    // Cancel all existing scheduled notifications to start fresh
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log("All existing notifications cancelled");

    // Filter out intrusive alarms - they are handled by expo-alarm-module
    const now = new Date();
    const nonIntrusiveReminders = reminders.filter((reminder) => {
      // Skip intrusive reminders
      if (reminder.isIntrusive || reminder.intrusive) {
        return false;
      }

      // Include recurring reminders
      if (reminder.recurring) {
        return true;
      }

      // Include future one-time reminders
      if (reminder.timer) {
        const reminderTime = new Date(reminder.timer);
        return reminderTime > now;
      }

      // Skip reminders without timer or recurring
      return false;
    });

    console.log(
      `Processing ${nonIntrusiveReminders.length} non-intrusive reminders out of ${reminders.length} total reminders`
    );

    // Debug: Log each reminder for analysis
    console.log("📋 All reminders analysis:");
    reminders.forEach((reminder, index) => {
      console.log(`${index + 1}. ID: ${reminder.id}`);
      console.log(`   Message: "${reminder.message}"`);
      console.log(`   Timer: ${reminder.timer || "None"}`);
      console.log(`   Recurring: ${reminder.recurring || "None"}`);
      console.log(`   IsIntrusive: ${reminder.isIntrusive || false}`);
      console.log(
        `   Will be scheduled: ${
          !reminder.isIntrusive &&
          !reminder.intrusive &&
          (reminder.timer || reminder.recurring)
            ? "✅ YES"
            : "❌ NO"
        }`
      );
      console.log("   ---");
    });

    if (nonIntrusiveReminders.length === 0) {
      console.log("❌ No non-intrusive reminders to schedule");
      return;
    }

    // Group reminders by type and timing for consolidation
    const groupedReminders = groupRemindersByTimeAndType(nonIntrusiveReminders);

    // Debug: Log grouped reminders
    console.log("📊 Grouped reminders for scheduling:");
    console.log(`Daily groups: ${Object.keys(groupedReminders.daily).length}`);
    Object.entries(groupedReminders.daily).forEach(([timeKey, reminders]) => {
      console.log(`  Time ${timeKey}: ${reminders.length} reminders`);
    });
    console.log(
      `Weekly groups: ${Object.keys(groupedReminders.weekly).length}`
    );
    Object.entries(groupedReminders.weekly).forEach(([timeKey, reminders]) => {
      console.log(`  Time ${timeKey}: ${reminders.length} reminders`);
    });
    console.log(
      `Monthly groups: ${Object.keys(groupedReminders.monthly).length}`
    );
    Object.entries(groupedReminders.monthly).forEach(([timeKey, reminders]) => {
      console.log(`  Time ${timeKey}: ${reminders.length} reminders`);
    });
    console.log(
      `One-time groups: ${Object.keys(groupedReminders.oneTime).length}`
    );
    Object.entries(groupedReminders.oneTime).forEach(([timeKey, reminders]) => {
      console.log(`  Time ${timeKey}: ${reminders.length} reminders`);
    });

    let totalScheduled = 0;

    // Schedule daily reminders (consolidated by time)
    for (const [timeKey, reminderGroup] of Object.entries(
      groupedReminders.daily
    )) {
      const result = await scheduleConsolidatedNotification(
        reminderGroup,
        timeKey,
        "daily"
      );
      if (result) totalScheduled++;
    }

    // Schedule weekly reminders (consolidated by day and time)
    for (const [timeKey, reminderGroup] of Object.entries(
      groupedReminders.weekly
    )) {
      const result = await scheduleConsolidatedNotification(
        reminderGroup,
        timeKey,
        "weekly"
      );
      if (result) totalScheduled++;
    }

    // Schedule monthly reminders (consolidated by day and time)
    for (const [timeKey, reminderGroup] of Object.entries(
      groupedReminders.monthly
    )) {
      const result = await scheduleConsolidatedNotification(
        reminderGroup,
        timeKey,
        "monthly"
      );
      if (result) totalScheduled++;
    }

    // Schedule one-time reminders (consolidated by exact time)
    for (const [timeKey, reminderGroup] of Object.entries(
      groupedReminders.oneTime
    )) {
      const result = await scheduleConsolidatedNotification(
        reminderGroup,
        timeKey,
        "oneTime"
      );
      if (result) totalScheduled++;
    }

    console.log(
      `Successfully scheduled ${totalScheduled} consolidated notifications`
    );

    // Log summary
    const summary = {
      daily: Object.keys(groupedReminders.daily).length,
      weekly: Object.keys(groupedReminders.weekly).length,
      monthly: Object.keys(groupedReminders.monthly).length,
      oneTime: Object.keys(groupedReminders.oneTime).length,
      total: totalScheduled,
    };
    console.log("Notification scheduling summary:", summary);
  } catch (error) {
    console.error("Critical error in rescheduleAllNotifications:", error);
    throw error;
  }
};

// Get comprehensive notification status for debugging
export const getNotificationStatus = async () => {
  try {
    const permissions = await Notifications.getPermissionsAsync();
    const scheduledNotifications =
      await Notifications.getAllScheduledNotificationsAsync();

    // Categorize notifications by channel
    const notificationsByChannel = {
      daily: scheduledNotifications.filter(
        (n) => n.content.channelId === "daily-reminders"
      ),
      weekly: scheduledNotifications.filter(
        (n) => n.content.channelId === "weekly-reminders"
      ),
      monthly: scheduledNotifications.filter(
        (n) => n.content.channelId === "monthly-reminders"
      ),
      oneTime: scheduledNotifications.filter(
        (n) => n.content.channelId === "one-time-reminders"
      ),
    };

    // Calculate consolidation stats
    const consolidationStats = {
      consolidated: scheduledNotifications.filter(
        (n) => n.content.data?.type === "consolidated"
      ).length,
      single: scheduledNotifications.filter(
        (n) => n.content.data?.type === "single"
      ).length,
      totalReminders: scheduledNotifications.reduce((sum, n) => {
        return sum + (n.content.data?.count || 1);
      }, 0),
    };

    const status = {
      permissions: {
        status: permissions.status,
        granted: permissions.granted,
        canAskAgain: permissions.canAskAgain,
      },
      scheduledCount: scheduledNotifications.length,
      channels: {
        daily: notificationsByChannel.daily.length,
        weekly: notificationsByChannel.weekly.length,
        monthly: notificationsByChannel.monthly.length,
        oneTime: notificationsByChannel.oneTime.length,
      },
      consolidation: consolidationStats,
      details: scheduledNotifications.map((n) => ({
        id: n.identifier,
        title: n.content.title,
        channel: n.content.channelId || "default",
        type: n.content.data?.type || "unknown",
        count: n.content.data?.count || 1,
        trigger: n.trigger,
      })),
    };

    console.log("Comprehensive Notification Status:", status);
    return status;
  } catch (error) {
    console.error("Error getting notification status:", error);
    return {
      permissions: { status: "unknown", granted: false, canAskAgain: false },
      scheduledCount: 0,
      channels: { daily: 0, weekly: 0, monthly: 0, oneTime: 0 },
      consolidation: { consolidated: 0, single: 0, totalReminders: 0 },
      details: [],
      error: error.message,
    };
  }
};

// Additional utility functions for notification management

// Get next trigger dates for all scheduled notifications
export const getUpcomingNotifications = async () => {
  try {
    const scheduledNotifications =
      await Notifications.getAllScheduledNotificationsAsync();
    const upcoming = [];

    for (const notification of scheduledNotifications) {
      try {
        const nextTriggerDate = await Notifications.getNextTriggerDateAsync(
          notification.trigger
        );
        if (nextTriggerDate) {
          upcoming.push({
            id: notification.identifier,
            title: notification.content.title,
            body: notification.content.body,
            nextTrigger: new Date(nextTriggerDate),
            channel: notification.content.channelId,
            type: notification.content.data?.type,
            count: notification.content.data?.count || 1,
          });
        }
      } catch (error) {
        console.warn(
          `Could not get next trigger date for notification ${notification.identifier}:`,
          error
        );
      }
    }

    // Sort by next trigger date
    upcoming.sort((a, b) => a.nextTrigger - b.nextTrigger);

    console.log(`Found ${upcoming.length} upcoming notifications`);
    return upcoming;
  } catch (error) {
    console.error("Error getting upcoming notifications:", error);
    return [];
  }
};

// Clear all scheduled notifications (useful for testing/debugging)
export const clearAllNotifications = async () => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log("All notifications cleared successfully");
    return true;
  } catch (error) {
    console.error("Error clearing all notifications:", error);
    return false;
  }
};

// Debug function to schedule a test notification
export const scheduleTestNotification = async () => {
  try {
    await initializeNotificationChannels();

    const testNotification = {
      content: {
        title: "🧪 Test Notification",
        body: "This is a test notification to verify the system is working",
        channelId: "daily-reminders",
        sound: "default",
        priority: Notifications.AndroidNotificationPriority.HIGH,
        badge: 1,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 10, // 10 seconds from now
        channelId: "daily-reminders",
      },
    };

    const notificationId =
      await Notifications.scheduleNotificationAsync(testNotification);
    console.log(`Test notification scheduled with ID: ${notificationId}`);
    return notificationId;
  } catch (error) {
    console.error("Error scheduling test notification:", error);
    return null;
  }
};

// Schedule a confirmation notification for recurring reminders
export const scheduleConfirmationNotification = async (reminder) => {
  try {
    await initializeNotificationChannels();

    const recurringType = reminder.recurring;
    if (
      !recurringType ||
      !["daily", "weekly", "monthly"].includes(recurringType)
    ) {
      console.log(
        "Not a recurring reminder, skipping confirmation notification"
      );
      return null;
    }

    const typeEmojis = {
      daily: "📅",
      weekly: "📆",
      monthly: "🗓️",
    };

    const confirmationNotification = {
      content: {
        title: `${typeEmojis[recurringType]} ${recurringType.charAt(0).toUpperCase() + recurringType.slice(1)} Reminder Added!`,
        body: `"${reminder.message}" - This confirmation shows your notifications are working properly.`,
        channelId: getChannelId(recurringType),
        sound: "default",
        priority: Notifications.AndroidNotificationPriority.HIGH,
        badge: 1,
        categoryIdentifier: getCategoryId(recurringType),
        data: {
          type: "confirmation",
          reminderId: reminder.id,
          recurringType: recurringType,
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 3, // 3 seconds from now
      },
    };

    const notificationId = await Notifications.scheduleNotificationAsync(
      confirmationNotification
    );
    console.log(
      `Confirmation notification scheduled with ID: ${notificationId} for ${recurringType} reminder`
    );
    return notificationId;
  } catch (error) {
    console.error("Error scheduling confirmation notification:", error);
    return null;
  }
};
