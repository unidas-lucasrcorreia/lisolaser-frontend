import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomeSkeleton } from './home-skeleton';

describe('HomeSkeleton', () => {
  let component: HomeSkeleton;
  let fixture: ComponentFixture<HomeSkeleton>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeSkeleton],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeSkeleton);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
