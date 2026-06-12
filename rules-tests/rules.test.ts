/**
 * Firebase Realtime Database security-rules tests for database.rules.json.
 *
 * Run with:
 *   firebase emulators:exec --only database "npx vitest run rules-tests"
 * (or `npm run test:rules`).
 */
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { get, ref, remove, set, update } from 'firebase/database';

let testEnv: RulesTestEnvironment;

const memberPayload = {
  name: 'Student One',
  email: 'student1@nobles.edu',
  joinedAt: 1750000000000,
};

const requestPayload = {
  name: 'Student One',
  email: 'student1@nobles.edu',
  requestedAt: 1750000000000,
  message: 'Please let me in',
};

const userClubEntry = { joinedAt: 1750000000000 };

function db(uid?: string) {
  const ctx = uid
    ? testEnv.authenticatedContext(uid)
    : testEnv.unauthenticatedContext();
  return ctx.database();
}

async function seed() {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const admin = ctx.database();
    await set(ref(admin), {
      clubs: {
        directory: {
          openclub: {
            name: 'Open Club',
            subject: 'Fun',
            is_active: true,
            join_policy: 'open',
            leader: { leader1: { name: 'Leader One' } },
            advisor: { advisor1: { name: 'Advisor One' } },
          },
          apprclub: {
            name: 'Approval Club',
            subject: 'Serious Business',
            is_active: true,
            join_policy: 'approval',
            leader: { leader1: { name: 'Leader One' } },
          },
          otherclub: {
            name: 'Other Club',
            subject: 'Other Things',
            is_active: true,
            // no join_policy -> defaults to open
            leader: { leader2: { name: 'Leader Two' } },
          },
        },
        admins: {
          admin1: true,
        },
      },
      events: {
        evt1: {
          title: 'Open Club Meeting',
          clubId: 'openclub',
          start: '2026-06-15T10:00:00',
        },
      },
    });
  });
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'nobles-20183',
    database: {
      rules: readFileSync('database.rules.json', 'utf8'),
      host: '127.0.0.1',
      port: 9000,
    },
  });
}, 30_000);

afterAll(async () => {
  await testEnv?.cleanup();
});

beforeEach(async () => {
  await testEnv.clearDatabase();
  await seed();
}, 30_000);

describe('a. directory and member reads', () => {
  it('unauthenticated CAN read /clubs/directory', async () => {
    await assertSucceeds(get(ref(db(), 'clubs/directory')));
  });

  it('unauthenticated CANNOT read /clubs/members/openclub', async () => {
    await assertFails(get(ref(db(), 'clubs/members/openclub')));
  });

  it('authenticated student CAN read /clubs/members/openclub', async () => {
    await assertSucceeds(get(ref(db('student1'), 'clubs/members/openclub')));
  });
});

describe('b. open-club self join (multi-path fan-out)', () => {
  it('student1 CAN join openclub with member + user fan-out', async () => {
    await assertSucceeds(
      update(ref(db('student1')), {
        'clubs/members/openclub/student1': memberPayload,
        'users/public/student1/clubs/openclub': userClubEntry,
      }),
    );
  });

  it('student1 CAN join a club whose join_policy is missing (defaults open)', async () => {
    await assertSucceeds(
      update(ref(db('student1')), {
        'clubs/members/otherclub/student1': memberPayload,
        'users/public/student1/clubs/otherclub': userClubEntry,
      }),
    );
  });

  it('member payload missing required fields fails .validate', async () => {
    await assertFails(
      set(ref(db('student1'), 'clubs/members/openclub/student1'), {
        name: 'Student One',
        // missing email + joinedAt
      }),
    );
  });
});

describe('c. approval-club self join is denied', () => {
  it('student1 CANNOT write /clubs/members/apprclub/student1', async () => {
    await assertFails(
      set(ref(db('student1'), 'clubs/members/apprclub/student1'), memberPayload),
    );
  });

  it('student1 CANNOT sneak the approval join into a multi-path update', async () => {
    await assertFails(
      update(ref(db('student1')), {
        'clubs/members/apprclub/student1': memberPayload,
        'users/public/student1/clubs/apprclub': userClubEntry,
      }),
    );
  });
});

describe('d. join requests (create + withdraw by requester)', () => {
  it('student1 CAN create a join request with user fan-out', async () => {
    await assertSucceeds(
      update(ref(db('student1')), {
        'clubs/join_requests/apprclub/student1': requestPayload,
        'users/public/student1/clubs_pending/apprclub': true,
      }),
    );
  });

  it('student1 CAN read their own request but NOT the request list', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await set(
        ref(ctx.database(), 'clubs/join_requests/apprclub/student1'),
        requestPayload,
      );
    });
    await assertSucceeds(
      get(ref(db('student1'), 'clubs/join_requests/apprclub/student1')),
    );
    await assertFails(get(ref(db('student1'), 'clubs/join_requests/apprclub')));
  });

  it('leader1 CAN list requests for their club; leader2 CANNOT', async () => {
    await assertSucceeds(get(ref(db('leader1'), 'clubs/join_requests/apprclub')));
    await assertFails(get(ref(db('leader2'), 'clubs/join_requests/apprclub')));
  });

  it('student1 CAN withdraw (delete) their own request', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await set(
        ref(ctx.database(), 'clubs/join_requests/apprclub/student1'),
        requestPayload,
      );
    });
    await assertSucceeds(
      remove(ref(db('student1'), 'clubs/join_requests/apprclub/student1')),
    );
  });

  it('request payload missing requestedAt fails .validate', async () => {
    await assertFails(
      set(ref(db('student1'), 'clubs/join_requests/apprclub/student1'), {
        name: 'Student One',
        email: 'student1@nobles.edu',
      }),
    );
  });
});

describe('e. approval fan-out by leaders', () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await set(
        ref(ctx.database(), 'clubs/join_requests/apprclub/student1'),
        requestPayload,
      );
    });
  });

  const approvalUpdate = {
    'clubs/join_requests/apprclub/student1': null,
    'clubs/members/apprclub/student1': memberPayload,
    'users/public/student1/clubs/apprclub': userClubEntry,
  };

  it('leader1 (leader of apprclub) CAN approve', async () => {
    await assertSucceeds(update(ref(db('leader1')), approvalUpdate));
  });

  it('leader2 (leader of a different club) CANNOT approve', async () => {
    await assertFails(update(ref(db('leader2')), approvalUpdate));
  });

  it('admin1 CAN approve', async () => {
    // Note: the admin path relies on /users/public/$uid admin write, since
    // the clubs/$clubId sub-rule only names leaders/advisors.
    await assertSucceeds(update(ref(db('admin1')), approvalUpdate));
  });
});

describe('f. events', () => {
  const newEvent = {
    title: 'New Open Club Event',
    clubId: 'openclub',
    start: '2026-06-20T15:00:00',
  };

  it('student1 CANNOT create an event for openclub', async () => {
    await assertFails(set(ref(db('student1'), 'events/evt2'), newEvent));
  });

  it('leader1 CAN create an event for openclub', async () => {
    await assertSucceeds(set(ref(db('leader1'), 'events/evt2'), newEvent));
  });

  it('leader2 CANNOT hijack evt1 into otherclub (data-side check)', async () => {
    await assertFails(
      set(ref(db('leader2'), 'events/evt1'), {
        title: 'Stolen Event',
        clubId: 'otherclub',
        start: '2026-06-15T10:00:00',
      }),
    );
  });

  it('leader1 CANNOT move evt1 into a club they do not lead (newData-side check)', async () => {
    await assertFails(
      set(ref(db('leader1'), 'events/evt1'), {
        title: 'Open Club Meeting',
        clubId: 'otherclub',
        start: '2026-06-15T10:00:00',
      }),
    );
  });

  it('admin1 CAN edit any event', async () => {
    await assertSucceeds(
      set(ref(db('admin1'), 'events/evt1'), {
        title: 'Renamed by Admin',
        clubId: 'openclub',
        start: '2026-06-15T11:00:00',
      }),
    );
  });

  it('admin1 CAN delete any event', async () => {
    await assertSucceeds(remove(ref(db('admin1'), 'events/evt1')));
  });

  it('leader1 CAN delete evt1 (their club)', async () => {
    await assertSucceeds(remove(ref(db('leader1'), 'events/evt1')));
  });

  it('leader2 CANNOT delete evt1 (not their club)', async () => {
    await assertFails(remove(ref(db('leader2'), 'events/evt1')));
  });

  it('event missing required fields fails .validate even for admin', async () => {
    await assertFails(
      set(ref(db('admin1'), 'events/evt3'), {
        title: 'No clubId or start',
      }),
    );
  });
});

describe('g. user profiles', () => {
  it('student1 CAN write their own /users/public profile', async () => {
    await assertSucceeds(
      set(ref(db('student1'), 'users/public/student1'), {
        name: 'Student One',
        email: 'student1@nobles.edu',
      }),
    );
  });

  it("student1 CANNOT write leader1's profile", async () => {
    await assertFails(
      set(ref(db('student1'), 'users/public/leader1'), {
        name: 'Imposter',
      }),
    );
  });

  it("admin1 CAN write another user's profile", async () => {
    await assertSucceeds(
      set(ref(db('admin1'), 'users/public/student1'), {
        name: 'Edited by Admin',
        email: 'student1@nobles.edu',
      }),
    );
  });
});

describe('h. joining a nonexistent club', () => {
  it('student1 CANNOT join a club id missing from the directory', async () => {
    await assertFails(
      set(ref(db('student1'), 'clubs/members/ghostclub/student1'), memberPayload),
    );
  });
});

describe('i. member removal', () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const admin = ctx.database();
      await set(
        ref(admin, 'clubs/members/openclub/student1'),
        memberPayload,
      );
      await set(
        ref(admin, 'users/public/student1/clubs/openclub'),
        userClubEntry,
      );
    });
  });

  const removalUpdate = {
    'clubs/members/openclub/student1': null,
    'users/public/student1/clubs/openclub': null,
  };

  it('leader1 CAN remove student1 with full fan-out', async () => {
    await assertSucceeds(update(ref(db('leader1')), removalUpdate));
  });

  it('student1 CAN leave openclub themselves (fan-out)', async () => {
    await assertSucceeds(update(ref(db('student1')), removalUpdate));
  });

  it('student1 CAN leave even an approval club (delete always allowed for self)', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await set(
        ref(ctx.database(), 'clubs/members/apprclub/student1'),
        memberPayload,
      );
    });
    await assertSucceeds(
      remove(ref(db('student1'), 'clubs/members/apprclub/student1')),
    );
  });

  it("leader2 CANNOT remove a member of someone else's club", async () => {
    await assertFails(
      remove(ref(db('leader2'), 'clubs/members/openclub/student1')),
    );
  });
});
