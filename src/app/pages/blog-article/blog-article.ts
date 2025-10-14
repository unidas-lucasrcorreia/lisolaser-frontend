import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { switchMap } from 'rxjs';
import { Skeleton } from '../../core/skeleton/skeleton';
import { CmsService, BlogPost } from '../../core/services/cms-service';

@Component({
  selector: 'app-blog-article',
  standalone: true,
  imports: [CommonModule, RouterModule, Skeleton],
  templateUrl: './blog-article.html',
  styleUrls: ['./blog-article.scss'],
})
export class BlogArticle implements OnInit {
  private route = inject(ActivatedRoute);
  private cms = inject(CmsService);
  private sanitizer = inject(DomSanitizer);

  loading = signal(false);
  error = signal('');
  post = signal<BlogPost | undefined>(undefined);
  safeContent = signal<SafeHtml | undefined>(undefined);

  skeleton(n: number) {
    return Array.from({ length: n }, (_, i) => i);
  }

  ngOnInit() {
    this.loading.set(true);
    this.error.set('');

    this.route.paramMap.pipe(switchMap((params) => this.cms.getBlogPostBySlug(params.get('slug') ?? ''))).subscribe({
      next: (p) => {
        this.post.set(p);
        this.safeContent.set(this.sanitizer.bypassSecurityTrustHtml(p.content ?? ''));
        this.loading.set(false);
      },
      error: (err) => {
        console.error('[Blog] detail error', err);
        this.error.set('Artigo não encontrado.');
        this.loading.set(false);
      },
    });
  }

  img(post?: BlogPost): string {
    const first = post?.mainImage?.[0] || post?.featuredImage?.[0] || null;
    return this.cms.assetUrl(first);
  }
}
