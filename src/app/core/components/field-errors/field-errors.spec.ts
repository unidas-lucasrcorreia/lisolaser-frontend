import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FieldErrors } from './field-errors';

describe('FieldErrors', () => {
  let component: FieldErrors;
  let fixture: ComponentFixture<FieldErrors>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FieldErrors],
    }).compileComponents();

    fixture = TestBed.createComponent(FieldErrors);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
