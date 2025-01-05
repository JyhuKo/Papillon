// On importe le type Grade depuis le chemin spécifié
import type { Grade } from "@/services/shared/Grade";

// Définition de l'interface GradeHistory pour représenter l'historique des notes avec une valeur numérique et une date
export interface GradeHistory {
  value: number; // La valeur de la note
  date: string; // La date à laquelle la note a été enregistrée
}

// Définition du type Target qui indique quel type de moyenne ou note cibler
type Target = "student" | "average" | "min" | "max";

// Définition du type AverageDiffGrade pour calculer la différence entre les moyennes avec et sans certaines notes
export type AverageDiffGrade = {
  difference?: number; // La différence de moyenne entre deux ensembles de notes
  with: number; // La moyenne avec toutes les notes
  without: number; // La moyenne sans certaines notes
};

// Fonction pour calculer la moyenne générale en suivant la méthode EcoleDirecte
const getPronoteAverage = (
  grades: Grade[],
  target: Target = "student",
  useMath: boolean = false
): number => {
  try {
    if (!grades || grades.length === 0) return -1;

    // Grouper les notes par matière
    const groupedBySubject = grades.reduce(
      (acc: Record<string, Grade[]>, grade) => {
        (acc[grade.subjectId || grade.subjectName] ||= []).push(grade);
        return acc;
      },
      {}
    );

    let totalWeightedSum = 0; // Somme des produits (Moyenne * Coefficient)
    let totalCoefficientSum = 0; // Somme des coefficients globaux

    // Calculer la moyenne totale
    for (const subjectGrades of Object.values(groupedBySubject)) {
      const subjectAverage = getSubjectAverage(subjectGrades, target, useMath);
      if (subjectAverage === -1) continue;

      const subjectCoefficient = subjectGrades.reduce(
        (sum, grade) => sum + grade.coefficient,
        0
      );

      totalWeightedSum += subjectAverage * subjectCoefficient;
      totalCoefficientSum += subjectCoefficient;
    }

    if (totalCoefficientSum === 0) return -1;
    return parseFloat((totalWeightedSum / totalCoefficientSum).toFixed(2));
  } catch (e) {
    return -1;
  }
};

// Fonction pour calculer la moyenne d'une matière spécifique selon EcoleDirecte
export const getSubjectAverage = (
  subject: Grade[],
  target: Target = "student",
  useMath: boolean = false,
  loop: boolean = false
): number => {
  try {
    let weightedSum = 0; // Somme des produits (Note * Coefficient)
    let coefficientSum = 0; // Somme des coefficients

    for (const grade of subject) {
      const targetGrade = grade[target];
      if (
        !targetGrade ||
        targetGrade.disabled ||
        targetGrade.value === null ||
        targetGrade.value < 0 ||
        grade.coefficient === 0 ||
        typeof targetGrade.value !== "number"
      )
        continue;

      const coefficient = grade.coefficient;
      const outOfValue = grade.outOf.value!;

      // Mettre les notes sur 20 si nécessaire
      const normalizedValue =
        outOfValue > 20
          ? (targetGrade.value / outOfValue) * 20
          : targetGrade.value;

      weightedSum += normalizedValue * coefficient;
      coefficientSum += coefficient;
    }

    if (coefficientSum === 0) return -1;
    return parseFloat((weightedSum / coefficientSum).toFixed(2));
  } catch (e) {
    return -1;
  }
};

// Fonction pour calculer la différence de moyenne avec et sans certaines notes
const getAverageDiffGrade = (
  grades: Grade[],
  list: Grade[],
  target: Target = "student",
  useMath: boolean = false
): AverageDiffGrade => {
  try {
    const baseAverage = getSubjectAverage(list, target, useMath);
    const baseWithoutGradeAverage = getSubjectAverage(
      list.filter((grade) => JSON.stringify(grades[0]) !== JSON.stringify(grade)),
      target,
      useMath
    );

    return {
      difference: baseWithoutGradeAverage - baseAverage,
      with: baseAverage,
      without: baseWithoutGradeAverage,
    };
  } catch (e) {
    return {
      difference: 0,
      with: 0,
      without: 0,
    };
  }
};

// Fonction pour générer un historique des moyennes au fil du temps
const getAveragesHistory = (
  grades: Grade[],
  target: Target = "student",
  final?: number,
  useMath: boolean = false
): GradeHistory[] => {
  try {
    const history = grades.map((grade, index) => ({
      value: getPronoteAverage(grades.slice(0, index + 1), target, useMath),
      date: new Date(grade.timestamp).toISOString(),
    }));

    history.sort((a, b) => a.date.localeCompare(b.date));

    history.push({
      value: final ?? getPronoteAverage(grades, target, useMath),
      date: new Date().toISOString(),
    });

    return history.filter((x) => !isNaN(x.value));
  } catch (e) {
    return [];
  }
};

// Exportation des fonctions pour utilisation externe
export { getPronoteAverage, getAverageDiffGrade, getAveragesHistory };
