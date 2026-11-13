// The photo admin (vanilla TS). Spec: docs/superpowers/specs/2026-11-14-admin-photos-design.md
import { admin as t } from '../../i18n/admin';

export async function start(root: HTMLElement): Promise<void> {
  root.innerHTML = `<h1 class="text-2xl font-bold">${t.title}</h1>`;
}
