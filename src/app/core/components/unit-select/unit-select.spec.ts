import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UnitSelect } from './unit-select';

describe('UnitSelect', () => {
  let component: UnitSelect;
  let fixture: ComponentFixture<UnitSelect>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UnitSelect],
    }).compileComponents();

    fixture = TestBed.createComponent(UnitSelect);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
