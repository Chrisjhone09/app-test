import { Routes } from '@angular/router';
import { LandingComponent } from './landing/landing.component';
import { GeneratorComponent } from './generator/generator.component';
import { QuizViewComponent } from './quiz-view/quiz-view.component';

export const routes: Routes = [
    { path: '', component: LandingComponent },
    { path: 'generate', component: GeneratorComponent },
    { path: 'quiz', component: QuizViewComponent },
];
