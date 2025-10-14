import { Component, OnInit, inject, signal, computed, Injector, runInInjectionContext, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { toObservable, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, map, skip } from 'rxjs/operators';
import { of } from 'rxjs';
import { catchError, retry, timeout } from 'rxjs/operators';
import { CmsService, BlogPost } from '../../core/services/cms-service';
import { Skeleton } from '../../core/skeleton/skeleton';

@Component({
  selector: 'app-blog',
  standalone: true,
  imports: [CommonModule, RouterModule, Skeleton],
  templateUrl: './blog.html',
  styleUrls: ['./blog.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Blog implements OnInit {
  private cms = inject(CmsService);
  private injector = inject(Injector);
  private cdr = inject(ChangeDetectorRef); // <- garante repaint em zoneless

  // ---- UI STATE (lista) ----
  loading = signal(false);
  error = signal('');
  page = signal(1);
  pageSize = signal(3);
  total = signal(0);
  posts = signal<BlogPost[]>([]);
  search = signal(''); // termo digitado

  canLoadMore = computed(() => this.posts().length < this.total());

  skeletonArray = computed(() => Array.from({ length: this.pageSize() }, (_, i) => i));
  loadMoreSkeletons = computed(() => Array.from({ length: 3 }, (_, i) => i));

  // ---- BLOG PAGE (hero/config) ----
  private readonly blogPageSig = signal<{
    title?: string;
    subtitle?: string;
    placeholder?: string;
    fieldLabel?: string;
  } | null>(null);

  readonly pageTitle = computed(() => this.blogPageSig()?.title ?? '');
  readonly pageSubtitle = computed(() => this.blogPageSig()?.subtitle ?? '');
  readonly pagePlaceholder = computed(() => this.blogPageSig()?.placeholder ?? 'Pesquisar no blog');
  readonly pageFieldLabel = computed(() => this.blogPageSig()?.fieldLabel ?? 'CARREGAR MAIS POSTS');

  ngOnInit() {
    // Observa o search com debounce
    runInInjectionContext(this.injector, () => {
      toObservable(this.search)
        .pipe(
          skip(1),
          map((s) => s.trim()),
          debounceTime(500),
          distinctUntilChanged(),
          takeUntilDestroyed(),
        )
        .subscribe(() => this.loadFirstPage());
    });

    // Carrega config do blog (hero) em paralelo
    this.fetchBlogPageConfig();

    // primeira carga de posts
    this.loadFirstPage();
  }

  private fetchBlogPageConfig() {
    this.cms
      .getCmsData('blog-page')
      .pipe(
        retry({ count: 2, delay: 400 }),
        timeout(6000),
        catchError((err) => {
          console.error('[Blog] blog-page error', err);
          // mantém defaults
          return of(null);
        }),
      )
      .subscribe((cfg) => {
        if (cfg) this.blogPageSig.set(cfg);
        // Em zoneless, assegura re-render:
        this.cdr.markForCheck();
      });
  }

  onSearchInput(ev: Event) {
    const value = (ev.target as HTMLInputElement).value ?? '';
    this.search.set(value);
  }

  private loadFirstPage() {
    this.page.set(1);
    this.posts.set([]);
    this.fetch(this.page(), this.pageSize(), false);
  }

  loadMore() {
    if (!this.canLoadMore() || this.loading()) return;
    this.fetch(this.page() + 1, this.pageSize(), true);
  }

  private fetch(page: number, size: number, append: boolean) {
    this.loading.set(true);
    this.error.set('');

    this.cms
      .getBlogPosts(page, size, this.search())
      .pipe(
        retry({ count: 1, delay: 300 }),
        timeout(8000),
        catchError((err) => {
          console.error('[Blog] list error', err);
          this.error.set('Não foi possível carregar os artigos.');
          this.loading.set(false);
          this.cdr.markForCheck(); // zoneless
          return of({ page: this.page(), total: this.total(), items: [] as BlogPost[] });
        }),
      )
      .subscribe((res) => {
        // se res veio do catchError, ele já está coerente
        this.page.set(res.page);
        this.total.set(res.total);

        if (append) {
          const merged = [...this.posts(), ...(res.items || [])].reduce<BlogPost[]>((acc, it) => {
            if (!acc.some((x) => x.slug === it.slug)) acc.push(it);
            return acc;
          }, []);
          this.posts.set(merged);
        } else {
          this.posts.set(res.items || []);
        }

        this.loading.set(false);
        this.cdr.markForCheck(); // assegura repaint
      });
  }

  img(post: BlogPost): string {
    const first = post.featuredImage?.[0] || post.mainImage?.[0] || null;
    return this.cms.assetUrl(first);
  }
}
