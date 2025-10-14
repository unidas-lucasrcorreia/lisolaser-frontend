import { Injectable, signal } from '@angular/core';

export type LeadDraft = {
  name: string;
  phone: string;
  unitId?: string; // id Squidex (opcional)
  franchiseId?: string | number; // UNO externalId
};

@Injectable({ providedIn: 'root' })
export class LeadStore {
  readonly draftLead = signal<LeadDraft | null>(null);

  setDraft(d: LeadDraft) {
    this.draftLead.set(d);
  }
  takeDraft(): LeadDraft | null {
    const d = this.draftLead();
    this.draftLead.set(null);
    return d;
  }
  clear() {
    this.draftLead.set(null);
  }
}
