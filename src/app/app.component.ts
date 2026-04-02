import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LandingComponent } from './landing/landing.component';
import { HttpClient, HttpEvent, HttpEventType, HttpResponse, HttpProgressEvent } from '@angular/common/http';
import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { environment } from '../environments/environment';

interface Quiz {
  quiz_title: string;
  multiple_choice: { question: string; options: string[]; correct_answer: string }[];
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent  {
  title = 'front';
  selectedFile: File | null = null;
  uploadProgress = 0;
  uploading = false;
  // Quiz-related
  quiz: Quiz | null = null;
  answers: string[] = [];
  score: number | null = null;
  private tabSub: Subscription | null = null;

  constructor(private http: HttpClient, private ngZone: NgZone) {}



  loadQuiz(json: any) {
    if (!json || !Array.isArray(json.multiple_choice)) {
      alert('Invalid quiz JSON');
      return;
    }
    this.quiz = json as Quiz;
    this.answers = new Array(this.quiz.multiple_choice.length).fill('');
    this.score = null;
  }

  loadQuizFromText(text: string) {
    if (!text) { alert('No JSON provided'); return; }
    try { this.loadQuiz(JSON.parse(text)); } catch (err) { alert('Invalid JSON: ' + err); }
  }

  fetchQuiz(url: string) {
    this.http.get<Quiz>(url).subscribe({ next: (data) => this.loadQuiz(data), error: (err) => { console.error(err); alert('Failed to fetch quiz'); }, });
  }

  submitQuiz() {
    if (!this.quiz) return;
    let correct = 0;
    this.quiz.multiple_choice.forEach((q, i) => { if (this.answers[i] === q.correct_answer) correct++; });
    this.score = correct;
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) this.validateFile(input.files[0]);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer?.files.length) this.validateFile(event.dataTransfer.files[0]);
  }

  onDragOver(event: DragEvent) { event.preventDefault(); }

  validateFile(file: File) {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ];

    if (!allowedTypes.includes(file.type)) { alert('Invalid file type'); return; }

    this.selectedFile = file;
    const formData = new FormData();
    formData.append('file', this.selectedFile);
    this.uploadProgress = 0; this.uploading = true;

    this.http.post(environment.apiUrl, formData, { reportProgress: true, observe: 'events' }).subscribe({
      next: (event: HttpEvent<any>) => {
        if (event.type === HttpEventType.UploadProgress) {
          const progress = event as HttpProgressEvent; const loaded = progress.loaded ?? 0; const total = progress.total ?? 0;
          if (total) this.uploadProgress = Math.round(100 * loaded / total);
        } else if (event.type === HttpEventType.Response) {
          const resp = event as HttpResponse<any>;
          this.uploadProgress = 100; this.uploading = false;
          const reply = resp.body && resp.body.reply !== undefined ? resp.body.reply : resp.body;
          let parsed: any = reply; if (typeof reply === 'string') { try { parsed = JSON.parse(reply); } catch (_) { } }
          if (parsed && Array.isArray(parsed.multiple_choice)) this.loadQuiz(parsed);
        }
      },
      error: (err) => { console.error('Upload failed', err); this.uploading = false; this.uploadProgress = 0; }
    });
  }
}