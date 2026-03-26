import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpEvent, HttpEventType, HttpResponse, HttpProgressEvent } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import OpenAI from "openai";
import dotenv from 'dotenv';

interface Quiz {
  quiz_title: string;
  multiple_choice: { question: string; options: string[]; correct_answer: string }[];
}

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
async click () {
dotenv.config();


const client = new OpenAI({apiKey: process.env['OPENAI_API_KEY']});

const response = await client.chat.completions.create({
  model: "gpt-4o",
  messages: [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: "What is 2 + 2?" }
  ],
});
console.log(response.choices[0].message);
}
  title = 'front';
  selectedFile: File | null = null;
  uploadProgress = 0;
  uploading = false;
  // Quiz-related
  quiz: Quiz | null = null;
  answers: string[] = [];
  score: number | null = null;

  constructor(private http: HttpClient) {}
  ngOnInit(): void {
    // Placeholder: you can fetch the quiz JSON from backend via this.http.get(url)
    // Example usage: this.fetchQuiz('https://example.com/api/quiz')
  }

  // Load quiz from a parsed JSON object that matches the backend shape
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
    if (!text) {
      alert('No JSON provided');
      return;
    }
    try {
      const parsed = JSON.parse(text);
      this.loadQuiz(parsed);
    } catch (err) {
      alert('Invalid JSON: ' + err);
    }
  }



  // Fetch quiz JSON from a backend URL
  fetchQuiz(url: string) {
    this.http.get<Quiz>(url).subscribe({
      next: (data) => this.loadQuiz(data),
      error: (err) => { console.error(err); alert('Failed to fetch quiz'); },
    });
  }

  submitQuiz() {
    if (!this.quiz) return;
    let correct = 0;
    this.quiz.multiple_choice.forEach((q, i) => {
      if (this.answers[i] === q.correct_answer) correct++;
    });
    this.score = correct;
  }



  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.validateFile(input.files[0]);
    }
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer?.files.length) {
      this.validateFile(event.dataTransfer.files[0]);
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
  }

  validateFile(file: File) {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ];

    if (!allowedTypes.includes(file.type)) {
      alert('Invalid file type');
      return;
    }

    this.selectedFile = file;

    const formData = new FormData();
    formData.append('file', this.selectedFile);
    this.uploadProgress = 0;
    this.uploading = true;

    const response = this.http.post('https://personal-test-ehhjb0a4hqgygrau.southeastasia-01.azurewebsites.net/api/file/upload-file', formData, {
      reportProgress: true,
      observe: 'events'
    }).subscribe({
      next: (event: HttpEvent<any>) => {
        if (event.type === HttpEventType.UploadProgress) {
          const progress = event as HttpProgressEvent;
          const loaded = progress.loaded ?? 0;
          const total = progress.total ?? 0;
          if (total) {
            this.uploadProgress = Math.round(100 * loaded / total);
          }
        } else if (event.type === HttpEventType.Response) {
          const resp = event as HttpResponse<any>;
          this.uploadProgress = 100;
          this.uploading = false;
          // backend returns { reply: assistantReply }
          const reply = resp.body && resp.body.reply !== undefined ? resp.body.reply : resp.body;
          console.log('Upload complete, server reply:', reply);

          // try parse string replies as JSON
          let parsed: any = reply;
          if (typeof reply === 'string') {
            try { parsed = JSON.parse(reply); } catch (_) { }
          }

          if (parsed && Array.isArray(parsed.multiple_choice)) {
            this.loadQuiz(parsed);
          }
        }
      },
      error: (err) => {
        console.error('Upload failed', err);
        this.uploading = false;
        this.uploadProgress = 0;
      }
    });
  }
}