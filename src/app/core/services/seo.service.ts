// seo.service.ts
import { Injectable, inject } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';

type MetaMap = Record<string, string | null>;

@Injectable({ providedIn: 'root' })
export class SeoService {
  private title = inject(Title);
  private meta = inject(Meta);

  private stack: { title: string | null; meta: MetaMap }[] = [];

  push(newTitle?: string, metas?: MetaMap) {
    // guarda estado atual
    const snapshot: { title: string | null; meta: MetaMap } = {
      title: this.title.getTitle(),
      meta: {},
    };

    if (metas) {
      for (const key of Object.keys(metas)) {
        snapshot.meta[key] = this.meta.getTag(`name="${key}"`)?.content ?? null;
      }
    }

    this.stack.push(snapshot);

    // aplica novos
    if (newTitle !== undefined) this.title.setTitle(newTitle);
    if (metas) {
      for (const [name, content] of Object.entries(metas)) {
        this.meta.updateTag({ name, content: content ?? '' });
      }
    }
  }

  pop() {
    const prev = this.stack.pop();
    if (!prev) return;

    if (prev.title !== null) this.title.setTitle(prev.title);

    for (const [name, content] of Object.entries(prev.meta)) {
      if (content === null) {
        this.meta.removeTag(`name="${name}"`);
      } else {
        this.meta.updateTag({ name, content });
      }
    }
  }
}
