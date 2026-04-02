import { Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB
const ALLOWED = ['application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain'];
const ALLOWED_EXT = /\.(pdf|docx?|pptx?|txt)$/i;

@Component({
    selector: 'app-generator',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './generator.component.html',
    styleUrls: ['./generator.component.css']
})
export class GeneratorComponent {
    @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

    // ── Settings
    numQuestions = 10;
    qMultiple = true;
    qTrueFalse = true;
    indentification = false;
    difficulty: 'easy' | 'medium' | 'hard' = 'medium';

    // ── Upload state
    dragOver = false;
    selectedFile: File | null = null;
    uploadState: 'idle' | 'uploading' | 'success' | 'error' = 'idle';
    uploadProgress = 0;   // 0 – 100
    errorMessage = '';

    get sliderPct(): string {
        return ((this.numQuestions - 1) / 29 * 100).toFixed(1) + '%';
    }

    get isReady(): boolean {
        return this.selectedFile !== null && this.uploadState === 'idle';
    }

    constructor(private http: HttpClient, private router: Router) { }

    // ── Open native file picker
    openPicker(): void {
        this.fileInput.nativeElement.click();
    }

    // ── Native <input type="file"> change
    onFileInput(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (input.files?.length) this.handleFile(input.files[0]);
        input.value = '';          // reset so same file can be re-selected
    }

    // ── Drag events
    onDragOver(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.dragOver = true;
    }

    onDragLeave(event: DragEvent): void {
        event.preventDefault();
        this.dragOver = false;
    }

    onDrop(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.dragOver = false;
        const file = event.dataTransfer?.files?.[0];
        if (file) this.handleFile(file);
    }

    // ── Validate & stage the file
    private handleFile(file: File): void {
        this.errorMessage = '';
        this.uploadState = 'idle';
        this.uploadProgress = 0;

        if (!ALLOWED.includes(file.type) && !ALLOWED_EXT.test(file.name)) {
            this.errorMessage = 'Unsupported file type. Please upload a PDF, DOCX, PPTX, or TXT.';
            return;
        }
        if (file.size > MAX_BYTES) {
            this.errorMessage = `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 50 MB.`;
            return;
        }

        this.selectedFile = file;
    }

    // ── Clear selection
    clearFile(): void {
        this.selectedFile = null;
        this.uploadState = 'idle';
        this.uploadProgress = 0;
        this.errorMessage = '';
    }

    // ── Send to backend
    generate(): void {
        if (!this.selectedFile) return;

        // Use ASP.NET Core [FromForm] dot-notation for nested object binding.
        // QuestionTypes.MultipleChoice etc. maps directly to the C# QuestionTypes class.
        const formData = new FormData();
        formData.append('File', this.selectedFile, this.selectedFile.name);
        formData.append('NumQuestions', String(this.numQuestions));
        formData.append('Difficulty', this.difficulty);
        formData.append('QuestionTypes.MultipleChoice', String(this.qMultiple));
        formData.append('QuestionTypes.TrueFalse', String(this.qTrueFalse));
        formData.append('QuestionTypes.Identification', String(this.indentification));


        this.uploadState = 'uploading';
        this.uploadProgress = 0;

        this.http.post(environment.apiUrl+"api/file/upload-file", formData, {
            reportProgress: true,
            observe: 'events',
        }).subscribe({
            next: (event) => {
                if (event.type === HttpEventType.UploadProgress) {
                    const total = event.total ?? this.selectedFile!.size;
                    this.uploadProgress = Math.round(100 * event.loaded / total);
                } else if (event.type === HttpEventType.Response) {
                    this.uploadProgress = 100;
                    try {
                        const body = event.body as { reply: string } | null;
                        if (!body?.reply) throw new Error('Empty or unexpected server response.');
                        const quizData = JSON.parse(body.reply);
                        this.uploadState = 'success';
                        this.router.navigate(['/quiz'], { state: { quizData } });
                    } catch (e: any) {
                        this.uploadState = 'error';
                        this.errorMessage = e?.message ?? 'Failed to parse quiz data from server.';
                    }
                }
            },
            error: (err) => {
                this.uploadState = 'error';
                this.errorMessage = err?.error?.message
                    ?? err?.message
                    ?? 'Upload failed. Please try again.';
            }
        });
    }
}
