import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

interface FeedbackResult { Stars: number; Count: number; }
interface FeedbackResponse { visits: number; numberOfQuizzes: number; result: FeedbackResult[]; }

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.css']
})
export class LandingComponent implements OnInit {
  constructor(private router: Router, private http: HttpClient) {}

  menuOpen = false;

  navigateTo(path: string) {
    this.menuOpen = false;
    this.router.navigate([path]);
  }

  // Stats
  visits = 0;
  numberOfQuizzes = 0;
  averageRating = 0;
  totalReviews = 0;
  ratingBars: { stars: number; pct: number }[] = [
    { stars: 5, pct: 89 },
    { stars: 4, pct: 8  },
    { stars: 3, pct: 2  },
    { stars: 2, pct: 0.5 },
    { stars: 1, pct: 0.5 },
  ];

  ngOnInit(): void {
    console.log('Fetching stats from API...');
    this.http.get<FeedbackResponse>(environment.apiUrl + 'api/file/get-feedback')
      .subscribe({
        next: (data) => {
          this.visits = data.visits;
          this.numberOfQuizzes = data.numberOfQuizzes;

          this.totalReviews = data.result.reduce((sum, r) => sum + r.Count, 0);

          if (this.totalReviews > 0) {
            const weightedSum = data.result.reduce((sum, r) => sum + r.Stars * r.Count, 0);
            this.averageRating = Math.round((weightedSum / this.totalReviews) * 10) / 10;

            // result IS the ratingBars — map directly, sorted 5→1
            const allStars = [5, 4, 3, 2, 1];
            const countMap = new Map<number, number>(data.result.map(r => [r.Stars, r.Count]));
            this.ratingBars = allStars.map(s => ({
              stars: s,
              pct: Math.round((countMap.get(s) ?? 0) / this.totalReviews * 100)
            }));
          }
        },
        error: () => { /* keep default placeholder values on error */ }
      });
  }

  formatNum(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1_000)     return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'k';
    return String(n);
  }
}
