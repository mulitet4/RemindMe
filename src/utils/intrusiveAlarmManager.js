/**
 * Day-Zen Intrusive Alarm Manager
 *
 * This module exclusively handles intrusive alarms using `expo-alarm-module`.
 * Regular notifications are managed by `notificationScheduler.js`.
 *
 * Key Features:
 * - Bypasses "Do Not Disturb" and silent mode.
 * - Wakes the device to display a full-screen alarm.
 * - Supports snooze and dismiss actions.
 */

import * as Notifications from "expo-notifications";
import {
  scheduleAlarm,
  stopAlarm,
  removeAlarm,
  getAllAlarms,
} from "expo-alarm-module";

export async function stopCurrentAlarm() {
  try {
    await stopAlarm();
    console.log("Intrusive alarm stopped successfully.");
  } catch (e) {
    console.error("Failed to stop intrusive alarm:", e);
  }
}

export async function scheduleIntrusiveAlarm(reminder) {
  if (!reminder.isIntrusive) {
    return {
      success: false,
      reason: "Not an intrusive reminder.",
    };
  }

  const isDaily = reminder.recurring === "daily";
  const hasTimer = reminder.timer;

  if (!isDaily && !hasTimer) {
    return { success: false, reason: "No timer specified for one-off alarm." };
  }

  let alarmTime = new Date();
  if (isDaily) {
    alarmTime.setDate(alarmTime.getDate() + 1);
    if (hasTimer) {
      const reminderTime = new Date(reminder.timer);
      alarmTime.setHours(reminderTime.getHours(), reminderTime.getMinutes(), 0);
    }
  } else {
    alarmTime = new Date(reminder.timer);
    if (alarmTime < new Date()) {
      return { success: false, reason: "Reminder time is in the past." };
    }
  }

  const alarm = {
    uid: reminder.id,
    day: alarmTime,
    title: isDaily ? "Daily Intrusive Alarm" : "Intrusive Alarm",
    description: reminder.message,
    showDismiss: true,
    showSnooze: true,
    snoozeInterval: 5,
    repeating: isDaily,
    active: true,
  };

  try {
    await scheduleAlarm(alarm);
    return { success: true, type: isDaily ? "intrusive-daily" : "intrusive" };
  } catch (e) {
    console.error("Failed to schedule intrusive alarm:", e);
    return { success: false, reason: e.message };
  }
}

export async function cancelIntrusiveAlarm(reminderId) {
  console.log(`Attempting to cancel intrusive alarm with ID: ${reminderId}`);
  try {
    await removeAlarm(reminderId);
    console.log(
      `Intrusive alarm with ID: ${reminderId} cancelled successfully.`
    );
  } catch (e) {
    console.error(`Failed to cancel intrusive alarm with ID: ${reminderId}`, e);
  }
}

export async function rescheduleAllIntrusiveAlarms(reminders) {
  console.log("Rescheduling all intrusive alarms using expo-alarm-module...");
  try {
    // Get all existing intrusive alarms and remove them
    const activeAlarms = await getAllAlarms();
    console.log("Found active intrusive alarms to remove:", activeAlarms);
    for (const alarm of activeAlarms) {
      await removeAlarm(alarm.uid);
      console.log(`Removed existing intrusive alarm: ${alarm.uid}`);
    }

    // Filter for ONLY intrusive reminders AND exclude expired non-recurring ones
    const now = new Date();
    const intrusiveReminders = reminders.filter((reminder) => {
      // Must be intrusive
      if (!reminder.isIntrusive) return false;

      // Allow all recurring intrusive reminders (daily)
      if (reminder.recurring === "daily") return true;

      // For non-recurring intrusive reminders, check if they're not expired
      if (reminder.timer) {
        const reminderTime = new Date(reminder.timer);
        if (reminderTime < now) {
          console.log(
            `Skipping expired intrusive alarm: ${reminder.id} scheduled for ${reminderTime}`
          );
          return false;
        }
      }

      return true;
    });

    console.log(
      `Found ${intrusiveReminders.length} valid intrusive reminders to reschedule with expo-alarm-module (filtered ${reminders.filter((r) => r.isIntrusive).length - intrusiveReminders.length} expired alarms).`
    );

    let scheduledCount = 0;
    for (const reminder of intrusiveReminders) {
      const result = await scheduleIntrusiveAlarm(reminder);
      if (result.success) {
        scheduledCount++;
      }
    }

    console.log(
      `Finished rescheduling intrusive alarms. Successfully scheduled ${scheduledCount}/${intrusiveReminders.length} intrusive alarms.`
    );
  } catch (e) {
    console.error(
      "An error occurred during rescheduleAll for intrusive alarms:",
      e
    );
  }
}

export async function stop() {
  console.log("Attempting to stop current ringing intrusive alarm.");
  try {
    await stopAlarm();
    console.log("Stop intrusive alarm command sent successfully.");
  } catch (e) {
    console.error("Failed to stop intrusive alarm:", e);
  }
}

export async function getActive() {
  console.log("Fetching all active intrusive alarms.");
  try {
    const activeAlarms = await getAllAlarms();
    console.log("Active intrusive alarms retrieved:", activeAlarms);
    return activeAlarms;
  } catch (e) {
    console.error("Failed to get active intrusive alarms:", e);
    return [];
  }
}

export async function getAlarmSystemStatus() {
  console.log("Fetching alarm system status.");
  try {
    const activeAlarms = await getAllAlarms();
    const scheduledNotifications =
      await Notifications.getAllScheduledNotificationsAsync();

    const status = {
      alarms: {
        scheduled: activeAlarms.length,
        details: activeAlarms,
      },
      notifications: {
        scheduled: scheduledNotifications.length,
        details: scheduledNotifications,
      },
      backgroundFetch: {
        statusText: "Unknown",
        isRegistered: false,
      },
      libraries: {
        platform: "Unknown",
        alarmManager: false,
        alarmClock: false,
      },
    };
    console.log("Alarm system status:", status);
    return status;
  } catch (e) {
    console.error("Failed to get alarm system status:", e);
    return {
      alarms: { scheduled: 0, details: [] },
      notifications: { scheduled: 0, details: [] },
      backgroundFetch: {
        statusText: "Error",
        isRegistered: false,
      },
      libraries: {
        platform: "Unknown",
        alarmManager: false,
        alarmClock: false,
      },
    };
  }
}
