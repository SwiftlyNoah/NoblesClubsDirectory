import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import {
  SUBJECTS,
  clubImageSrc,
  findUserWithEmail,
  randomID,
  type Club,
  type ClubAdvisor,
  type ClubLeader,
  type ClubWithId,
  type JoinPolicy,
} from '../data';
import { uploadClubImage } from '../lib/images';
import { Modal } from './Modal';
import './ClubFormModal.css';

interface ClubFormModalProps {
  open: boolean;
  onClose: () => void;
  /** Existing club to edit; null/undefined registers a new one. */
  club?: ClubWithId | null;
  /** Persist the entry — the caller decides submitClub vs adminWriteClub. */
  onSubmit: (clubId: string, club: Club) => Promise<void> | void;
  title: string;
  /** Submit button label; defaults based on new vs edit. */
  submitLabel?: string;
}

export function ClubFormModal({ open, onClose, club, onSubmit, title, submitLabel }: ClubFormModalProps) {
  const { uid, email, firstName, personType } = useAuth();

  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [meetingRoom, setMeetingRoom] = useState('');
  const [signUp, setSignUp] = useState('');
  const [joinPolicy, setJoinPolicy] = useState<JoinPolicy>('open');
  const [leaders, setLeaders] = useState<Record<string, ClubLeader>>({});
  const [advisors, setAdvisors] = useState<Record<string, ClubAdvisor>>({});

  const [leaderEmail, setLeaderEmail] = useState('');
  const [leaderRole, setLeaderRole] = useState('');
  const [leaderError, setLeaderError] = useState<string | null>(null);
  const [advisorEmail, setAdvisorEmail] = useState('');
  const [advisorError, setAdvisorError] = useState<string | null>(null);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // (Re)initialize the form whenever the modal opens.
  useEffect(() => {
    if (!open) return;
    setName(club?.name ?? '');
    setSubject(club?.subject ?? '');
    setDescription(club?.description ?? '');
    setMeetingRoom(club?.meeting_room ?? '');
    setSignUp(club?.sign_up ?? '');
    setJoinPolicy(club?.join_policy ?? 'open');
    if (club) {
      setLeaders({ ...(club.leader ?? {}) });
      setAdvisors({ ...(club.advisor ?? {}) });
    } else if (uid) {
      // The person registering a new club joins it automatically:
      // students lead, faculty advise (unknown person types default to leader).
      const self = { name: firstName ?? '', email: email ?? '' };
      if (personType === 'faculty') {
        setLeaders({});
        setAdvisors({ [uid]: self });
      } else {
        setLeaders({ [uid]: self });
        setAdvisors({});
      }
    } else {
      setLeaders({});
      setAdvisors({});
    }
    setLeaderEmail('');
    setLeaderRole('');
    setLeaderError(null);
    setAdvisorEmail('');
    setAdvisorError(null);
    setImageFile(null);
    setImageError(null);
    setSubmitError(null);
    setBusy(false);
  }, [open, club, uid, email, firstName, personType]);

  const filePreview = useMemo(() => (imageFile ? URL.createObjectURL(imageFile) : null), [imageFile]);
  useEffect(() => {
    return () => {
      if (filePreview) URL.revokeObjectURL(filePreview);
    };
  }, [filePreview]);
  const preview = filePreview ?? (club ? clubImageSrc(club) : null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setImageError(null);
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setImageError('Please choose an image file (PNG, JPG, GIF, …).');
      return;
    }
    if (file.size >= 5 * 1024 * 1024) {
      setImageError('That image is too large — please choose one under 5MB.');
      return;
    }
    setImageFile(file);
  };

  const addLeader = async () => {
    const lookup = leaderEmail.trim();
    if (!lookup) return;
    setLeaderError(null);
    try {
      const found = await findUserWithEmail(lookup);
      if (!found) {
        setLeaderError(`No account found with email: ${lookup}`);
        return;
      }
      if (found.person_type === 'faculty') {
        setLeaderError(`${lookup} is not a student — add them as an advisor instead.`);
        return;
      }
      const role = leaderRole.trim();
      setLeaders((prev) => ({
        ...prev,
        [found.uid]: { name: found.first, email: found.email, ...(role ? { role } : {}) },
      }));
      setLeaderEmail('');
      setLeaderRole('');
    } catch {
      setLeaderError('Lookup failed — please try again.');
    }
  };

  const addAdvisor = async () => {
    const lookup = advisorEmail.trim();
    if (!lookup) return;
    setAdvisorError(null);
    try {
      const found = await findUserWithEmail(lookup);
      if (!found) {
        setAdvisorError(`No account found with email: ${lookup}`);
        return;
      }
      if (found.person_type === 'student') {
        setAdvisorError(`${lookup} is not a faculty member — add them as a leader instead.`);
        return;
      }
      setAdvisors((prev) => ({ ...prev, [found.uid]: { name: found.first, email: found.email } }));
      setAdvisorEmail('');
    } catch {
      setAdvisorError('Lookup failed — please try again.');
    }
  };

  const removeLeader = (key: string) => {
    setLeaders((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => k !== key)));
  };

  const removeAdvisor = (key: string) => {
    setAdvisors((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => k !== key)));
  };

  const valid =
    name.trim() !== '' &&
    subject !== '' &&
    description.trim() !== '' &&
    (Object.keys(leaders).length > 0 || Object.keys(advisors).length > 0);

  const handleSubmit = async () => {
    if (!valid || busy) return;
    setBusy(true);
    setSubmitError(null);
    try {
      let image = club?.image;
      let imageUrl = club?.image_url;
      if (imageFile) {
        const uploaded = await uploadClubImage(imageFile);
        image = uploaded.image;
        imageUrl = uploaded.image_url;
      }
      const entry: Club = {
        name: name.trim(),
        description: description.trim(),
        subject,
        image,
        image_url: imageUrl,
        meeting_room: meetingRoom.trim() || undefined,
        sign_up: signUp.trim() || undefined,
        is_active: club?.is_active ?? true,
        join_policy: joinPolicy,
        leader: Object.keys(leaders).length > 0 ? leaders : undefined,
        advisor: Object.keys(advisors).length > 0 ? advisors : undefined,
      };
      await onSubmit(club?.id ?? randomID(), entry);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Something went wrong — please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={title} width={720}>
      <div className="club-form">
        {!club && (
          <p className="club-form-note">
            Please only register a club when you are sure you want to form it and have already
            booked assembly time to announce it.
          </p>
        )}

        <div className="club-form-image">
          {preview ? (
            <img src={preview} alt="Club banner preview" />
          ) : (
            <div className="club-form-image-placeholder">No banner yet</div>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleFileChange} />
          <button className="btn-outline" onClick={() => fileInputRef.current?.click()}>
            {preview ? 'Replace image' : 'Add club banner'}
          </button>
          {imageError && <p className="club-form-error">{imageError}</p>}
        </div>

        <div className="club-form-field">
          <label className="form-label" htmlFor="club-form-name">
            Club/org name
          </label>
          <input
            id="club-form-name"
            className="text-field"
            type="text"
            placeholder="Club/org name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>

        <div className="club-form-row">
          <div className="club-form-field">
            <label className="form-label" htmlFor="club-form-subject">
              Main subject
            </label>
            <select
              id="club-form-subject"
              className="select-field"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
            >
              <option value="" disabled>
                Choose a subject…
              </option>
              {SUBJECTS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="club-form-field">
            <label className="form-label" htmlFor="club-form-room">
              Meeting room
            </label>
            <input
              id="club-form-room"
              className="text-field"
              type="text"
              placeholder="e.g. Library 2"
              value={meetingRoom}
              onChange={(event) => setMeetingRoom(event.target.value)}
            />
          </div>
        </div>

        <div className="club-form-field">
          <label className="form-label" htmlFor="club-form-description">
            Mission statement
          </label>
          <textarea
            id="club-form-description"
            className="text-area"
            rows={5}
            placeholder="What is this club about?"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>

        <div className="club-form-field">
          <label className="form-label" htmlFor="club-form-signup">
            How to sign up
          </label>
          <input
            id="club-form-signup"
            className="text-field"
            type="text"
            placeholder="Sign-up info (optional)"
            value={signUp}
            onChange={(event) => setSignUp(event.target.value)}
          />
        </div>

        <div className="club-form-field">
          <span className="form-label">Join policy</span>
          <label className="club-form-radio">
            <input
              type="radio"
              name="club-form-join-policy"
              checked={joinPolicy === 'open'}
              onChange={() => setJoinPolicy('open')}
            />
            Anyone can join instantly
          </label>
          <label className="club-form-radio">
            <input
              type="radio"
              name="club-form-join-policy"
              checked={joinPolicy === 'approval'}
              onChange={() => setJoinPolicy('approval')}
            />
            Requests require leader approval
          </label>
        </div>

        <div className="club-form-field">
          <span className="form-label">Student leaders</span>
          {Object.entries(leaders).map(([key, leader]) => (
            <div key={key} className="club-form-person">
              <span>
                <strong>{leader.name || leader.email}</strong>
                {leader.role ? ` — ${leader.role}` : ''}
              </span>
              <button className="club-form-remove" onClick={() => removeLeader(key)}>
                Remove
              </button>
            </div>
          ))}
          <div className="club-form-person-add">
            <input
              className="text-field"
              type="email"
              placeholder="Student email"
              value={leaderEmail}
              onChange={(event) => setLeaderEmail(event.target.value)}
            />
            <input
              className="text-field"
              type="text"
              placeholder="Role (e.g. President)"
              value={leaderRole}
              onChange={(event) => setLeaderRole(event.target.value)}
            />
            <button className="btn-outline" disabled={!leaderEmail.trim()} onClick={() => void addLeader()}>
              Add
            </button>
          </div>
          {leaderError && <p className="club-form-error">{leaderError}</p>}
        </div>

        <div className="club-form-field">
          <span className="form-label">Faculty advisors</span>
          {Object.entries(advisors).map(([key, advisor]) => (
            <div key={key} className="club-form-person">
              <span>
                <strong>{advisor.name || advisor.email}</strong>
              </span>
              <button className="club-form-remove" onClick={() => removeAdvisor(key)}>
                Remove
              </button>
            </div>
          ))}
          <div className="club-form-person-add">
            <input
              className="text-field"
              type="email"
              placeholder="Faculty email"
              value={advisorEmail}
              onChange={(event) => setAdvisorEmail(event.target.value)}
            />
            <button className="btn-outline" disabled={!advisorEmail.trim()} onClick={() => void addAdvisor()}>
              Add
            </button>
          </div>
          {advisorError && <p className="club-form-error">{advisorError}</p>}
        </div>

        <div className="club-form-footer">
          <button className="btn-primary" disabled={!valid || busy} onClick={() => void handleSubmit()}>
            {busy ? 'Saving…' : (submitLabel ?? (club ? 'Save changes' : 'Submit club'))}
          </button>
          <button className="btn-outline" disabled={busy} onClick={onClose}>
            Cancel
          </button>
        </div>
        {submitError && <p className="club-form-error">{submitError}</p>}
      </div>
    </Modal>
  );
}
