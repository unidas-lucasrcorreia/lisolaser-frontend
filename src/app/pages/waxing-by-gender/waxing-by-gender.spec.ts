import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WaxingByGender } from './waxing-by-gender';

describe('WaxingByGender', () => {
  let component: WaxingByGender;
  let fixture: ComponentFixture<WaxingByGender>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WaxingByGender],
    }).compileComponents();

    fixture = TestBed.createComponent(WaxingByGender);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
