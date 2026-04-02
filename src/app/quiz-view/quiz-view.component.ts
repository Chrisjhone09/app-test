import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
interface Question {
    text: string;
    type: 'Multiple Choice' | 'True / False' | 'Identification';
    options: string[];
    correct: number;
    answer?: string; // for Identification questions
}

interface QuizData {
    fileName: string;
    questions: Question[];
}

@Component({
    selector: 'app-quiz-view',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './quiz-view.component.html',
    styleUrls: ['./quiz-view.component.css']
})
export class QuizViewComponent implements OnInit, OnDestroy {
    fileName = '';
    currentIndex = 0;
    selected: number | null = null;
    identificationAnswer = '';
    revealed = false;
    score = 0;
    questions: Question[] = [];
  answers: Array<number | string | null> = [];

  // Results & feedback
  showResults = false;
  showFeedback = false;
  feedbackStars = 0;
  feedbackHoverStars = 0;
  feedbackComment = '';
  feedbackSubmitted = false;

  // Timer
  private timerRef: ReturnType<typeof setInterval> | null = null;
  timerSeconds = 0;

  get timerDisplay(): string {
    const m = Math.floor(this.timerSeconds / 60);
    const s = this.timerSeconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

    get current(): Question { return this.questions[this.currentIndex]; }
    get total(): number { return this.questions.length; }
    get progressPct(): string {
        if (!this.total) return '0%';
        return ((this.currentIndex) / this.total * 100).toFixed(1) + '%';
    }
    get labels(): string[] { return ['A', 'B', 'C', 'D', 'E', 'F']; }

  get scorePct(): number {
    return this.total ? Math.round(this.score / this.total * 100) : 0;
  }

  get scoreGrade(): string {
    const p = this.scorePct;
    if (p >= 90) return 'Excellent!';
    if (p >= 75) return 'Great job!';
    if (p >= 60) return 'Good effort!';
    return 'Keep practicing!';
  }

  get scoreEmoji(): string {
    const p = this.scorePct;
    if (p >= 90) return '🎉';
    if (p >= 75) return '👍';
    if (p >= 60) return '😊';
    return '💪';
  }

  get scoreGradeClass(): string {
    const p = this.scorePct;
    if (p >= 90) return 'excellent';
    if (p >= 75) return 'great';
    if (p >= 60) return 'good';
    return 'practice';
  }

    constructor(private router: Router, private http : HttpClient) { }

    ngOnInit(): void {
        // getCurrentNavigation() is null by ngOnInit; state lives in history.state
        const state = history.state;
        const quizData: QuizData | null = state?.['quizData'] ?? null;

        if (quizData?.questions?.length) {
            this.fileName = quizData.fileName ?? '';
            this.questions = quizData.questions;
        } else {
            // Fallback demo data so the page is never blank while developing
            this.fileName = 'Demo Quiz';
            this.questions = [
                {
                    text: 'Which pigment is primarily responsible for capturing light energy in photosynthesis?',
                    type: 'Multiple Choice',
                    options: ['Carotene', 'Chlorophyll a', 'Xanthophyll', 'Anthocyanin'],
                    correct: 1
                },
                {
                    text: 'Photosynthesis converts light energy into chemical energy stored in glucose.',
                    type: 'True / False',
                    options: ['True', 'False'],
                    correct: 0
                }
            ];
        }

        this.timerSeconds = this.total * 60; // 1 minute per question
        this.answers = new Array(this.questions.length).fill(null);
        this.timerRef = setInterval(() => {
            if (this.timerSeconds > 0) this.timerSeconds--;
        }, 1000);
    }

    ngOnDestroy(): void {
        if (this.timerRef) clearInterval(this.timerRef);
    }

    selectOption(idx: number): void {
        if (this.revealed) return;
        this.selected = idx;
        this.revealed = true;
        this.answers[this.currentIndex] = idx;
        if (idx === this.current.correct) this.score++;
    }

    submitIdentification(): void {
        if (this.revealed) return;
        this.revealed = true;
        this.answers[this.currentIndex] = this.identificationAnswer;
        const correct = this.identificationAnswer.trim().toLowerCase() ===
            (this.current.answer ?? '').trim().toLowerCase();
        if (correct) this.score++;
    }

    next(): void {
        if (this.currentIndex < this.total - 1) {
            this.currentIndex++;
            this.selected = null;
            this.revealed = false;
            this.identificationAnswer = '';
        }
    }

    prev(): void {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this.selected = null;
            this.revealed = false;
            this.identificationAnswer = '';
        }
    }

    finishQuiz(): void {
        if (this.timerRef) { clearInterval(this.timerRef); this.timerRef = null; }
        this.showResults = true;
        setTimeout(() => { this.showFeedback = true; }, 1200);
    }

    isAnswerCorrect(i: number): boolean {
        const q = this.questions[i];
        const ans = this.answers[i];
        if (q.type === 'Identification') {
            return typeof ans === 'string' &&
                ans.trim().toLowerCase() === (q.answer ?? '').trim().toLowerCase();
        }
        return ans === q.correct;
    }

    // Feedback
    hoverStar(n: number): void { this.feedbackHoverStars = n; }
    leaveStar(): void { this.feedbackHoverStars = 0; }
    clickStar(n: number): void { this.feedbackStars = n; }
    closeFeedback(): void { this.showFeedback = false; }
    submitFeedback(): void {
        this.feedbackSubmitted = true;
        setTimeout(() => { this.showFeedback = false; }, 1800);

        this.http.post(environment.apiUrl+"api/file/submit-feedback", {
            stars: this.feedbackStars,
            comments: this.feedbackComment
        }).subscribe();

    }

    retakeQuiz(): void { this.router.navigate(['/generate']); }

    optionState(idx: number): string {
        if (!this.revealed) return this.selected === idx ? 'selected' : '';
        if (idx === this.current.correct) return 'correct';
        if (idx === this.selected) return 'wrong';
        return '';
    }
}

