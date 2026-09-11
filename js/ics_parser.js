/**
 * ics_parser.js - Trình phân tích file iCalendar (.ics) chạy thuần trên JavaScript
 * Hỗ trợ RFC 5545, phân loại danh mục (normal, practical, midterm, final, holiday)
 */

(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.IcsParser = factory();
  }
}(typeof self !== 'undefined' ? self : this, function() {

  function stripDiacritics(str) {
    if (!str) return '';
    return str.normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, 'd')
      .toLowerCase();
  }

  function detectCategory(categoriesRaw, summary, description) {
    const cat = stripDiacritics(categoriesRaw || '');
    const combined = stripDiacritics((summary || '') + ' ' + (description || ''));

    if (cat.includes('thi giua') || cat.includes('giua ky') || combined.includes('thi giua') || combined.includes('giua ky')) {
      return 'midterm';
    }
    if (cat.includes('thi cuoi') || cat.includes('cuoi ky') || combined.includes('thi cuoi') || combined.includes('cuoi ky')) {
      return 'final';
    }
    if (cat.includes('thuc hanh') || combined.includes('thuc hanh')) {
      return 'practical';
    }
    if (cat.includes('nghi le') || combined.includes('nghi le') || combined.includes('nghi tet')) {
      return 'holiday';
    }
    return 'normal';
  }

  function unfoldLines(rawText) {
    const rawLines = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    const lines = [];
    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i];
      if (!line) continue;
      if (line.startsWith(' ') || line.startsWith('\t')) {
        if (lines.length > 0) {
          lines[lines.length - 1] += line.substring(1);
        } else {
          lines.push(line.substring(1));
        }
      } else {
        lines.push(line);
      }
    }
    return lines;
  }

  function unescapeIcsText(str) {
    if (!str) return '';
    return str
      .replace(/\\n/gi, '\n')
      .replace(/\\,/g, ',')
      .replace(/\\;/g, ';')
      .replace(/\\\\/g, '\\');
  }

  function parseIcsDate(val, params) {
    val = (val || '').trim();
    const isAllDay = (params && params.VALUE === 'DATE') || (/^\d{8}$/.test(val));

    if (isAllDay && /^\d{8}$/.test(val)) {
      const y = parseInt(val.substring(0, 4), 10);
      const m = parseInt(val.substring(4, 6), 10) - 1;
      const d = parseInt(val.substring(6, 8), 10);
      return { date: new Date(y, m, d, 0, 0, 0), isAllDay: true };
    }

    const cleanVal = val.replace(/[-:]/g, '');
    const m = cleanVal.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?/);
    if (m) {
      const y = parseInt(m[1], 10);
      const mon = parseInt(m[2], 10) - 1;
      const d = parseInt(m[3], 10);
      const h = parseInt(m[4], 10);
      const mi = parseInt(m[5], 10);
      const s = parseInt(m[6], 10);
      const isZ = !!m[7];

      if (isZ) {
        return { date: new Date(Date.UTC(y, mon, d, h, mi, s)), isAllDay: false };
      }
      return { date: new Date(y, mon, d, h, mi, s), isAllDay: false };
    }

    const parsed = new Date(val);
    if (!isNaN(parsed.getTime())) {
      return { date: parsed, isAllDay: false };
    }

    return { date: new Date(), isAllDay: false };
  }

  function parseIcs(rawText) {
    if (!rawText) return [];
    const lines = unfoldLines(rawText);
    const rawEvents = [];
    let currentEv = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      if (line === 'BEGIN:VEVENT') {
        currentEv = { params: {} };
        continue;
      }

      if (line === 'END:VEVENT') {
        if (currentEv && currentEv.DTSTART) {
          rawEvents.push(currentEv);
        }
        currentEv = null;
        continue;
      }

      if (!currentEv) continue;

      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;

      const keyPart = line.substring(0, colonIdx).trim();
      const valPart = line.substring(colonIdx + 1).trim();

      const keyPieces = keyPart.split(';');
      const propName = keyPieces[0].toUpperCase();
      const params = {};

      for (let p = 1; p < keyPieces.length; p++) {
        const eqIdx = keyPieces[p].indexOf('=');
        if (eqIdx !== -1) {
          const pName = keyPieces[p].substring(0, eqIdx).trim().toUpperCase();
          const pVal = keyPieces[p].substring(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
          params[pName] = pVal;
        }
      }

      currentEv[propName] = valPart;
      if (!currentEv.params) currentEv.params = {};
      currentEv.params[propName] = params;
    }

    const events = [];

    for (let i = 0; i < rawEvents.length; i++) {
      const ev = rawEvents[i];
      const startParsed = parseIcsDate(ev.DTSTART, (ev.params && ev.params.DTSTART) || {});
      const startDate = startParsed.date;
      const isAllDay = startParsed.isAllDay;

      let endDate = null;
      if (ev.DTEND) {
        endDate = parseIcsDate(ev.DTEND, (ev.params && ev.params.DTEND) || {}).date;
      } else if (ev.DURATION) {
        const durMatch = ev.DURATION.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
        if (durMatch) {
          const dh = parseInt(durMatch[1] || '0', 10);
          const dm = parseInt(durMatch[2] || '0', 10);
          endDate = new Date(startDate.getTime() + (dh * 3600 + dm * 60) * 1000);
        }
      }

      if (!endDate) {
        endDate = isAllDay ? new Date(startDate.getTime() + 86400000) : new Date(startDate.getTime() + 3600000);
      }

      const summary = unescapeIcsText(ev.SUMMARY || 'Không có tiêu đề');
      const description = unescapeIcsText(ev.DESCRIPTION || '');
      const location = unescapeIcsText(ev.LOCATION || '');
      const category = detectCategory(ev.CATEGORIES, summary, description);

      events.push({
        title: summary,
        start: startDate,
        end: endDate,
        allDay: isAllDay,
        location: location,
        description: description,
        category: category
      });

      if (ev.RRULE) {
        const rruleParts = {};
        ev.RRULE.split(';').forEach(pair => {
          const [k, v] = pair.split('=');
          if (k && v) rruleParts[k.toUpperCase()] = v;
        });

        if (rruleParts.FREQ === 'WEEKLY') {
          const interval = parseInt(rruleParts.INTERVAL || '1', 10);
          let count = parseInt(rruleParts.COUNT || '20', 10);
          let untilDate = null;
          if (rruleParts.UNTIL) {
            untilDate = parseIcsDate(rruleParts.UNTIL).date;
          }

          const durationMs = endDate.getTime() - startDate.getTime();
          let nextStart = new Date(startDate.getTime());

          for (let step = 1; step < count; step++) {
            nextStart = new Date(nextStart.getTime() + (interval * 7 * 86400000));
            if (untilDate && nextStart > untilDate) break;

            const nextEnd = new Date(nextStart.getTime() + durationMs);
            events.push({
              title: summary,
              start: nextStart,
              end: nextEnd,
              allDay: isAllDay,
              location: location,
              description: description,
              category: category
            });
          }
        }
      }
    }

    events.sort((a, b) => a.start.getTime() - b.start.getTime());
    return events;
  }

  return {
    parseIcs: parseIcs,
    detectCategory: detectCategory,
    stripDiacritics: stripDiacritics
  };
}));