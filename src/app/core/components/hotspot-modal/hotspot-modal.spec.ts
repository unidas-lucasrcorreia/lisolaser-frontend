import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HotspotModal } from './hotspot-modal';

describe('HotspotModal', () => {
  let component: HotspotModal;
  let fixture: ComponentFixture<HotspotModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HotspotModal],
    }).compileComponents();

    fixture = TestBed.createComponent(HotspotModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
