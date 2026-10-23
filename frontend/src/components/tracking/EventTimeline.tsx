import React from 'react';
import { formatDate } from '@/lib/utils';
import { TrackingEvent } from '@/types';
import { MapPin, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export interface EventTimelineProps {
  events: TrackingEvent[];
}

/**
 * Historical Tracking Events Timeline Component.
 * Displays reverse-chronological list of carrier scans, updates, and exceptions.
 *
 * @param events - Array of tracking events with timestamps, descriptions, and locations.
 */
export function EventTimeline({ events }: EventTimelineProps) {
  if (!events || events.length === 0) {
    return (
      <div className="py-8 text-center text-slate-500 text-sm">
        No se han registrado eventos para esta guía todavía.
      </div>
    );
  }

  // Sort events newest first
  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  return (
    <div className="relative border-l border-slate-800 ml-4 pl-6 space-y-6 my-4">
      {sortedEvents.map((event, index) => {
        const isLatest = index === 0;

        return (
          <div key={event.id || index} className="relative group">
            {/* Timeline node dot */}
            <div
              className={`absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full border-2 transition-transform group-hover:scale-125 ${
                isLatest
                  ? 'bg-indigo-500 border-indigo-400 ring-4 ring-indigo-500/20'
                  : 'bg-slate-800 border-slate-700'
              }`}
            />

            {/* Event details card */}
            <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-4 transition-colors hover:border-slate-700">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <Badge status={event.status}>{event.status.replace(/_/g, ' ')}</Badge>
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{formatDate(event.timestamp)}</span>
                </div>
              </div>

              <p className="text-sm font-medium text-slate-200">{event.description}</p>

              {event.location && (
                <div className="flex items-center gap-1 text-xs text-slate-400 mt-2">
                  <MapPin className="w-3 h-3 text-indigo-400" />
                  <span>{event.location}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
