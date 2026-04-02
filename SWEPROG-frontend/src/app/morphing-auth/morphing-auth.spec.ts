import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MorphingAuth } from './morphing-auth';

describe('MorphingAuth', () => {
  let component: MorphingAuth;
  let fixture: ComponentFixture<MorphingAuth>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MorphingAuth]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MorphingAuth);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
