import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, Input, Inject, PLATFORM_ID, HostListener } from '@angular/core';
import { HotspotModal, Hotspot, HotspotImage } from '../hotspot-modal/hotspot-modal';
import { RouterModule } from '@angular/router';

export type Gender = 'feminino' | 'masculino';
type Side = 'frente' | 'costas';
type Variant = `${Gender}-${Side}`;

const MOBILE_MAX_WIDTH = 767;

@Component({
  selector: 'app-treatment-areas',
  standalone: true,
  imports: [CommonModule, HotspotModal, RouterModule],
  templateUrl: './treatment-areas.html',
  styleUrl: './treatment-areas.scss',
})
export class TreatmentAreas {
  gender: Gender = 'feminino';
  side: Side = 'frente';
  genderLocked = false;

  private isBrowser = false;
  isMobile = false;

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
    if (this.isBrowser) {
      this.isMobile = window.innerWidth <= MOBILE_MAX_WIDTH;
    }
  }

  // Atualiza flag ao redimensionar
  @HostListener('window:resize')
  onResize() {
    if (!this.isBrowser) return;
    const mobile = window.innerWidth <= MOBILE_MAX_WIDTH;
    if (mobile !== this.isMobile) this.isMobile = mobile;
  }

  @Input({ alias: 'initialGender' })
  set _initialGender(value: Gender | undefined) {
    if (value) {
      this.gender = value;
      this.genderLocked = true;
    }
  }

  private imagesByVariant: Record<Variant, HotspotImage> = {
    'feminino-frente': {
      src: '/images/treatments/treatment-fem-frente.png',
      width: 373,
      height: 792,
      alt: 'Áreas de tratamento — feminino (frente)',
    },
    'feminino-costas': {
      src: '/images/treatments/treatment-fem-costas.png',
      width: 373,
      height: 792,
      alt: 'Áreas de tratamento — feminino (costas)',
    },
    'masculino-frente': {
      src: '/images/treatments/treatment-masc-frente.png',
      width: 373,
      height: 792,
      alt: 'Áreas de tratamento — masculino (frente)',
    },
    'masculino-costas': {
      src: '/images/treatments/treatment-masc-costas.png',
      width: 373,
      height: 792,
      alt: 'Áreas de tratamento — masculino (costas)',
    },
  };

  // DESKTOP (seu array completo como já estava)
  private hotspotsByVariantDesktop: Record<Variant, Hotspot[]> = {
    'feminino-frente': [
      { id: 'rosto_testa', x: 49.1, y: 4.5, title: 'Testa' },
      { id: 'rosto_glabela', x: 46, y: 7.5, title: 'Glabela' },
      { id: 'rosto_faces_laterais', x: 40, y: 8.5, title: 'Faces Laterais' },
      { id: 'rosto_buco', x: 45, y: 11, title: 'Buço' },
      { id: 'rosto_pescoco', x: 61, y: 14, title: 'Pescoço' },
      { id: 'rosto_queixo', x: 50, y: 15, title: 'Queixo' },
      { id: 'seios', x: 44, y: 25.7, title: 'Seios' },
      { id: 'aureola', x: 70, y: 30, title: 'Aréola' },
      { id: 'axilas', x: 80, y: 25, title: 'Axilas' },
      { id: 'ante_braco', x: 23, y: 32, title: 'Ante-Braço' },
      { id: 'braco_inteiro', x: 86, y: 31, title: 'Braços Inteiros' },
      { id: 'maos_dedos', x: 35, y: 37, title: 'Mãos e Dedos' },
      { id: 'barriga', x: 59, y: 35, title: 'Barriga' },
      { id: 'linha_alba', x: 56, y: 42, title: 'Linha Alba' },
      { id: 'virilha', x: 45, y: 47.1, title: 'Virilha' },
      { id: 'virilha_biquini', x: 53, y: 49, title: 'Virilha Biquíni' },
      { id: 'coxa', x: 71, y: 54, title: 'Coxa' },
      { id: 'anterior_de_coxa', x: 55, y: 59.7, title: 'Anterior de Coxa' },
      { id: 'joelho', x: 58, y: 70.7, title: 'Joelho' },
      { id: 'meia_perna', x: 64, y: 80, title: 'Meia Perna' },
      { id: 'pes_dedos', x: 60, y: 96, title: 'Pés e Dedos' },
    ],
    'feminino-costas': [
      { id: 'nuca', x: 72, y: 13, title: 'Nuca' },
      { id: 'costas', x: 70, y: 27, title: 'Costas' },
      { id: 'lombar', x: 72, y: 37, title: 'Lombar' },
      { id: 'bananinha', x: 84, y: 46, title: 'Bananinha do bumbum' },
      { id: 'gluteos', x: 61, y: 48, title: 'Glúteos' },
      { id: 'perianal', x: 75, y: 50, title: 'Perianal' },
      { id: 'posterior_coxa', x: 92, y: 57, title: 'Posterior da coxa' },
      { id: 'interior_coxa', x: 75, y: 62, title: 'Interior da coxa' },
      { id: 'lateral_coxa', x: 47, y: 57, title: 'Lateral da coxa' },
    ],
    'masculino-frente': [
      { id: 'cabeca', x: 47, y: 2, title: 'Cabeça' },
      { id: 'nariz', x: 55, y: 11, title: 'Nariz' },
      { id: 'testa', x: 43, y: 6, title: 'Testa' },
      { id: 'glabela', x: 51, y: 7, title: 'Glabela' },
      { id: 'costeletas', x: 60, y: 5, title: 'Costeletas' },
      { id: 'orelhas', x: 34, y: 10, title: 'Orelhas' },
      { id: 'maxilar', x: 41, y: 14, title: 'Maxilar' },
      { id: 'barba_parcial', x: 55, y: 16, title: 'Bigode, cavanhaque ou faixa de barba' },
      { id: 'barba_completa', x: 50, y: 17, title: 'Barba completa' },
      { id: 'torax', x: 47, y: 28, title: 'Tórax - peitoral' },
      { id: 'axilas', x: 69, y: 28, title: 'Axilas' },
      { id: 'braco_inteiro', x: 80, y: 38, title: 'Braço Inteiro' },
      { id: 'meio_braco', x: 24, y: 34, title: 'Meio Braço' },
      { id: 'abdomen', x: 48, y: 39, title: 'Abdômen' },
      { id: 'maos_dedos', x: 18, y: 56, title: 'Mãos e dedos' },
      { id: 'virilha_completa', x: 73, y: 47, title: 'Virilha completa' },
      { id: 'coxas', x: 64, y: 69, title: 'Coxas' },
      { id: 'joelhos', x: 64, y: 75, title: 'Joelhos' },
      { id: 'meia_perna', x: 63, y: 80, title: 'Meia perna' },
      { id: 'perna', x: 45, y: 80, title: 'Pernas inteiras' },
      { id: 'pes_dedos', x: 60, y: 88, title: 'Pés e dedos' },
    ],
    'masculino-costas': [
      { id: 'nuca', x: 45, y: 15, title: 'Nuca' },
      { id: 'ombros', x: 28, y: 21, title: 'Ombros' },
      { id: 'costas', x: 56, y: 25, title: 'Costas' },
      { id: 'lombar', x: 46, y: 38, title: 'Lombar' },
      { id: 'gluteos', x: 38, y: 50, title: 'Glúteos' },
      { id: 'perianal', x: 52, y: 58, title: 'Perianal' },
    ],
  };

  // MOBILE (menos pontos — exemplos)
  private hotspotsByVariantMobile: Record<Variant, Hotspot[]> = {
    'feminino-frente': [
      {
        id: 'rosto',
        x: 55,
        y: 6,
        title: 'Áreas no rosto:',
        text: 'Glabela, testa queixo, pescoço faces Laterais',
      },
      {
        id: 'tronco',
        x: 51,
        y: 28,
        title: 'Áreas no tronco:',
        text: 'Seios, aureola, axilas, antebraço, Braços Inteiros, mões e dedos, barriga, linha alba ',
      },
      {
        id: 'inferior',
        x: 68,
        y: 48,
        title: 'Áreas inferiores:',
        text: 'Virilha,Virilha Biquini, Coxa, Anterior de Coxa, Joelho, Pés e Dedos',
      },
    ],
    'feminino-costas': [
      { id: 'superior', x: 72, y: 14, title: 'Áreas superiores:', text: 'Nuca e costas' },
      {
        id: 'quadril',
        x: 86,
        y: 47,
        title: 'Áreas no quadril:',
        text: 'Lombar, perianal, glúteo, bananinha do glúteo',
      },
      {
        id: 'inferior_costas',
        x: 45,
        y: 66,
        title: 'Áreas inferioress:',
        text: 'Posterior da coxa, Interior da coxa, Lateral da coxa',
      },
    ],
    'masculino-frente': [
      {
        id: 'cabeca',
        x: 40,
        y: 5,
        title: 'Áreas na cabeça:',
        text: 'Cabeça, glabela, testa queixo, pescoço, nariz, maxilar, costeletas, Bigode, cavanhaque ou faixa de barba, barba completa.',
      },
      {
        id: 'tronco',
        x: 67,
        y: 29,
        title: 'Áreas no tronco:',
        text: 'Tórax - peitoral, Meio braço, Mãos e dedos, Axilas, Braço inteiro e Abdômen',
      },
      {
        id: 'inferiores',
        x: 41,
        y: 71,
        title: 'Áreas inferiores',
        text: 'Coxas, Virilha completa, Joelhos, Meia perna, Pernas inteiras, Pés e dedos',
      },
    ],
    'masculino-costas': [
      {
        id: 'superior',
        x: 56,
        y: 25,
        title: 'Áreas superiores:',
        text: 'Nuca, Costas, Ombros, Lombar',
      },
      { id: 'inferior', x: 37, y: 70, title: 'Áreas inferiores:', text: 'Glúteos, Perianal' },
    ],
  };

  get currentKey(): Variant {
    return `${this.gender}-${this.side}` as Variant;
  }
  get currentImage(): HotspotImage {
    return this.imagesByVariant[this.currentKey];
  }
  get currentHotspots(): Hotspot[] {
    const table = this.isMobile ? this.hotspotsByVariantMobile : this.hotspotsByVariantDesktop;
    return table[this.currentKey];
  }

  setGender(g: Gender) {
    if (!this.genderLocked && this.gender !== g) this.gender = g;
  }
  setSide(s: Side) {
    if (this.side !== s) this.side = s;
  }
}
