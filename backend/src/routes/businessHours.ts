import { Router, Request, Response, NextFunction } from 'express';
import { SystemConfig } from '../models/SystemConfig';
import { authMiddleware, requirePermission } from '../middleware/auth';
import { createAppError } from '../middleware/errorHandler';

const router = Router();

/**
 * Business hours are stored in SystemConfig as:
 *   - business_hours: JSON string of weekly schedule
 *     { "mon": { "open": "11:00", "close": "22:00", "enabled": true }, ... }
 *   - closed_dates: JSON string of dates array
 *     ["2026-01-01", "2026-12-25", ...]
 *   - business_timezone: IANA timezone string, e.g. "Europe/Dublin"
 */

interface DaySchedule {
  open: string;   // "HH:mm"
  close: string;  // "HH:mm"
  enabled: boolean;
}

type WeeklySchedule = Record<string, DaySchedule>;

const DEFAULT_SCHEDULE: WeeklySchedule = {
  mon: { open: '11:00', close: '22:00', enabled: true },
  tue: { open: '11:00', close: '22:00', enabled: true },
  wed: { open: '11:00', close: '22:00', enabled: true },
  thu: { open: '11:00', close: '22:00', enabled: true },
  fri: { open: '11:00', close: '22:00', enabled: true },
  sat: { open: '11:00', close: '22:00', enabled: true },
  sun: { open: '11:00', close: '22:00', enabled: true },
};

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

/**
 * GET /api/business-hours
 * Public endpoint — returns business hours config and current open/closed status.
 */
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [hoursDoc, closedDoc, tzDoc] = await Promise.all([
      SystemConfig.findOne({ key: 'business_hours' }).lean(),
      SystemConfig.findOne({ key: 'closed_dates' }).lean(),
      SystemConfig.findOne({ key: 'business_timezone' }).lean(),
    ]);

    const schedule: WeeklySchedule = hoursDoc ? JSON.parse(hoursDoc.value) : DEFAULT_SCHEDULE;
    const closedDates: string[] = closedDoc ? JSON.parse(closedDoc.value) : [];
    const timezone = tzDoc?.value || 'Europe/Dublin';

    // Calculate current status
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' });
    const todayStr = formatter.format(now); // "YYYY-MM-DD"

    const timeFormatter = new Intl.DateTimeFormat('en-GB', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: false });
    const currentTime = timeFormatter.format(now); // "HH:mm"

    const dayFormatter = new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'short' });
    const dayOfWeek = dayFormatter.format(now).toLowerCase().substring(0, 3); // "mon", "tue", etc.

    // Check closed dates first (highest priority)
    if (closedDates.includes(todayStr)) {
      res.json({
        isOpen: false,
        reason: 'closed_today',
        schedule,
        closedDates,
        timezone,
        currentTime,
        todayStr,
      });
      return;
    }

    // Check weekly schedule
    const todaySchedule = schedule[dayOfWeek];
    if (!todaySchedule || !todaySchedule.enabled) {
      res.json({
        isOpen: false,
        reason: 'day_off',
        schedule,
        closedDates,
        timezone,
        currentTime,
        todayStr,
      });
      return;
    }

    // Compare times
    const isOpen = currentTime >= todaySchedule.open && currentTime < todaySchedule.close;

    res.json({
      isOpen,
      reason: isOpen ? 'open' : 'outside_hours',
      todayOpen: todaySchedule.open,
      todayClose: todaySchedule.close,
      schedule,
      closedDates,
      timezone,
      currentTime,
      todayStr,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/business-hours
 * Admin endpoint — update business hours config.
 * Body: { schedule?: WeeklySchedule, closedDates?: string[], timezone?: string }
 */
router.put('/', authMiddleware, requirePermission('config:update'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { schedule, closedDates, timezone } = req.body;

    if (schedule) {
      // Validate schedule
      for (const day of DAY_KEYS) {
        if (schedule[day]) {
          const d = schedule[day];
          if (typeof d.open !== 'string' || typeof d.close !== 'string' || typeof d.enabled !== 'boolean') {
            throw createAppError('VALIDATION_ERROR', `Invalid schedule for ${day}`);
          }
          if (!/^\d{2}:\d{2}$/.test(d.open) || !/^\d{2}:\d{2}$/.test(d.close)) {
            throw createAppError('VALIDATION_ERROR', `Invalid time format for ${day}, expected HH:mm`);
          }
        }
      }
      await SystemConfig.findOneAndUpdate(
        { key: 'business_hours' },
        { key: 'business_hours', value: JSON.stringify(schedule) },
        { upsert: true, new: true },
      );
    }

    if (closedDates !== undefined) {
      if (!Array.isArray(closedDates)) {
        throw createAppError('VALIDATION_ERROR', 'closedDates must be an array of date strings');
      }
      // Validate date format
      for (const d of closedDates) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
          throw createAppError('VALIDATION_ERROR', `Invalid date format: ${d}, expected YYYY-MM-DD`);
        }
      }
      await SystemConfig.findOneAndUpdate(
        { key: 'closed_dates' },
        { key: 'closed_dates', value: JSON.stringify(closedDates) },
        { upsert: true, new: true },
      );
    }

    if (timezone) {
      if (typeof timezone !== 'string') {
        throw createAppError('VALIDATION_ERROR', 'timezone must be a string');
      }
      await SystemConfig.findOneAndUpdate(
        { key: 'business_timezone' },
        { key: 'business_timezone', value: timezone },
        { upsert: true, new: true },
      );
    }

    res.json({ message: 'Business hours updated' });
  } catch (err) {
    next(err);
  }
});

export default router;
