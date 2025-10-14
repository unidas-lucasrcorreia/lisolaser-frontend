import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Caroussel } from './caroussel';

describe('Caroussel', () => {
  let component: Caroussel;
  let fixture: ComponentFixture<Caroussel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Caroussel],
    }).compileComponents();

    fixture = TestBed.createComponent(Caroussel);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
