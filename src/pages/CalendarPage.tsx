import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin, { type DateClickArg } from '@fullcalendar/interaction';
import type { EventClickArg, EventInput, EventSourceFuncArg } from '@fullcalendar/core';
import { useAuth } from '../auth/AuthProvider';
import {
  SUBJECTS,
  expandOccurrences,
  fetchAllEvents,
  fetchClubDirectory,
  isClubManager,
  subjectColor,
  type ClubEventWithId,
  type ClubWithId,
} from '../data';
import { CalendarFilters } from '../components/calendar/CalendarFilters';
import { EventDetailModal } from '../components/calendar/EventDetailModal';
import { EventFormModal } from '../components/calendar/EventFormModal';
import { EmptyState } from '../components/EmptyState';
import { Spinner } from '../components/Spinner';
import './CalendarPage.css';

interface SelectedOccurrence {
  event: ClubEventWithId;
  start: number;
  end: number;
}

export function CalendarPage() {
  const { user, uid, isAdmin, myClubs } = useAuth();

  const [events, setEvents] = useState<ClubEventWithId[] | null>(null);
  const [clubs, setClubs] = useState<ClubWithId[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [selectedClubId, setSelectedClubId] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([...SUBJECTS]);
  const [myClubsOnly, setMyClubsOnly] = useState(false);

  const [selected, setSelected] = useState<SelectedOccurrence | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formEvent, setFormEvent] = useState<ClubEventWithId | null>(null);
  const [formInitialDate, setFormInitialDate] = useState<Date | null>(null);

  const calendarRef = useRef<FullCalendar>(null);

  const loadEvents = useCallback(async () => {
    try {
      setEvents(await fetchAllEvents());
    } catch (loadError) {
      console.error('Failed to load events:', loadError);
      setError('Could not load events. Please try again later.');
    }
  }, []);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    fetchClubDirectory(false)
      .then(setClubs)
      .catch((loadError) => {
        console.error('Failed to load club directory:', loadError);
        setError('Could not load events. Please try again later.');
      });
  }, []);

  // The signed-out "My clubs" state can't persist across a sign-out.
  useEffect(() => {
    if (!user) setMyClubsOnly(false);
  }, [user]);

  const filtered = useMemo(() => {
    if (!events) return [];
    // All subjects selected = no subject filter (covers legacy subjects too).
    const subjectFilterActive = selectedSubjects.length !== SUBJECTS.length;
    return events.filter(
      (event) =>
        (selectedClubId === '' || event.clubId === selectedClubId) &&
        (!subjectFilterActive || selectedSubjects.includes(event.clubSubject)) &&
        (!myClubsOnly || event.clubId in myClubs)
    );
  }, [events, selectedClubId, selectedSubjects, myClubsOnly, myClubs]);

  // The events function below is stable; it reads the latest filtered list here.
  const filteredRef = useRef(filtered);
  filteredRef.current = filtered;

  useEffect(() => {
    calendarRef.current?.getApi().refetchEvents();
  }, [filtered]);

  /** FullCalendar events function: expand occurrences within the visible range. */
  const fetchCalendarEvents = useCallback(
    (
      info: EventSourceFuncArg,
      success: (eventInputs: EventInput[]) => void,
      failure: (error: Error) => void
    ) => {
      try {
        const rangeStart = info.start.getTime();
        const rangeEnd = info.end.getTime();
        success(
          filteredRef.current.flatMap((event) => {
            const accent = subjectColor(event.clubSubject);
            return expandOccurrences(event, rangeStart, rangeEnd).map((occurrence) => ({
              id: `${event.id}:${occurrence.start}`,
              title: event.title,
              start: new Date(occurrence.start),
              end: new Date(occurrence.end),
              allDay: event.allDay ?? false,
              backgroundColor: accent,
              borderColor: accent,
              extendedProps: { eventId: event.id },
            }));
          })
        );
      } catch (expandError) {
        failure(expandError instanceof Error ? expandError : new Error(String(expandError)));
      }
    },
    []
  );

  const handleEventClick = useCallback((arg: EventClickArg) => {
    const eventId = arg.event.extendedProps.eventId as string;
    const source = filteredRef.current.find((event) => event.id === eventId);
    if (!source || !arg.event.start) return;
    const start = arg.event.start.getTime();
    const end = arg.event.end
      ? arg.event.end.getTime()
      : start + (source.duration ?? Math.max(0, source.end - source.start));
    setSelected({ event: source, start, end });
  }, []);

  const manageableClubs = useMemo(() => {
    if (!clubs) return [];
    return isAdmin ? clubs : clubs.filter((club) => isClubManager(club, uid));
  }, [clubs, isAdmin, uid]);

  const canCreate = manageableClubs.length > 0;

  const openCreate = (date: Date | null = null) => {
    setFormEvent(null);
    setFormInitialDate(date);
    setFormOpen(true);
  };

  const handleDateClick = (arg: DateClickArg) => {
    if (canCreate) openCreate(arg.date);
  };

  const loading = events === null || clubs === null;

  return (
    <div className="calendar-page">
      <div className="calendar-page-header">
        <h1 className="calendar-page-title">Events Calendar</h1>
        {canCreate && (
          <button className="btn-primary" onClick={() => openCreate()}>
            New event
          </button>
        )}
      </div>

      {error ? (
        <EmptyState icon="📅" message={error} />
      ) : loading ? (
        <Spinner label="Loading events…" />
      ) : (
        <>
          <CalendarFilters
            clubs={clubs}
            selectedClubId={selectedClubId}
            onClubChange={setSelectedClubId}
            selectedSubjects={selectedSubjects}
            onSubjectsChange={setSelectedSubjects}
            showMyClubsToggle={user !== null}
            myClubsOnly={myClubsOnly}
            onMyClubsOnlyChange={setMyClubsOnly}
          />
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,listMonth',
            }}
            events={fetchCalendarEvents}
            eventClick={handleEventClick}
            dateClick={handleDateClick}
            height="auto"
            eventTimeFormat={{ hour: 'numeric', minute: '2-digit', meridiem: 'short' }}
          />
        </>
      )}

      {selected && (
        <EventDetailModal
          event={selected.event}
          occurrenceStart={selected.start}
          occurrenceEnd={selected.end}
          club={clubs?.find((club) => club.id === selected.event.clubId)}
          onClose={() => setSelected(null)}
          onEdit={() => {
            setFormEvent(selected.event);
            setFormInitialDate(null);
            setFormOpen(true);
            setSelected(null);
          }}
          onDeleted={() => void loadEvents()}
        />
      )}

      <EventFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        event={formEvent}
        clubs={manageableClubs}
        initialDate={formInitialDate}
        onSaved={() => void loadEvents()}
      />
    </div>
  );
}
