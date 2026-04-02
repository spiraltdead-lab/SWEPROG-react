import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ContactPayload {
  name: string;
  email: string;
  message: string;
  offer?: string;
}

@Injectable({ providedIn: 'root' })
export class ContactService {
  private apiUrl = environment.apiUrl + 'api/contact';

  constructor(private http: HttpClient) {}

  send(data: ContactPayload): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(this.apiUrl, data);
  }
}
