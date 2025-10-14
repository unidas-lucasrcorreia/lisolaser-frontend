import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TreatmentAreas } from './treatment-areas';

describe('TreatmentAreas', () => {
  let component: TreatmentAreas;
  let fixture: ComponentFixture<TreatmentAreas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TreatmentAreas],
    }).compileComponents();

    fixture = TestBed.createComponent(TreatmentAreas);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
