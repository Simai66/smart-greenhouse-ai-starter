# Feature card — Audit remediation

## User outcome

Improve the redesigned Smart Greenhouse UI against the Impeccable audit while
keeping its approved functionality and device-control safety boundaries clear.

## Acceptance criteria

- Production build and tests complete successfully, or a separate operational
  blocker is documented with an owner and rollback-safe remediation.
- Text meets WCAG 2.1 AA contrast, keyboard users can bypass repeated
  navigation, and primary touch controls provide at least 44 by 44 pixel hit
  areas.
- Images are delivered efficiently, and motion respects reduced-motion
  preferences.
- The design-system source of truth is consistent with the approved redesign.

## Scope

- **In scope:** UI accessibility, responsive controls, image delivery, design
  documentation alignment, and build artifact validation diagnosis.
- **Out of scope:** connecting presentational device toggles to physical
  hardware, API/database changes, and unapproved visual rebranding.

## Affected areas

- UI: yes.
- API/database: no.
- Deployment/build tooling: investigation required.

## Confirmed design decision

- The approved light redesign is the design-system source of truth. `DESIGN.md`
  will be aligned to it; the UI will not be reverted to the legacy dark theme.

## Material risks

- The build validator fails on `cloudflare:` imports; remediation may require
  DevOps ownership and must not weaken production validation.

## Owners and dependency order

1. DevOps diagnoses the artifact-validator failure and proposes a safe fix.
2. Frontend prepares UI remediation within the approved light redesign.
3. The main agent obtains the theme source-of-truth decision.
4. Frontend implements approved changes; QA validates integration and release
   criteria.
