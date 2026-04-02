import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ContactFlowComponent } from './contact-flow';

describe('ContactFlowComponent', () => {
  let component: ContactFlowComponent;
  let fixture: ComponentFixture<ContactFlowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContactFlowComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ContactFlowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
