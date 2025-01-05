// Importation des types nécessaires
import type { Grade } from "@/services/shared/Grade";

// Interface pour représenter l'historique des notes
export interface GradeHistory {
  value: number; // Valeur de la note
  date: string; // Date de la note
}

// Définition du type `Target`
type Target = "student" | "average" | "min" | "max";

// Définition du type `AverageDiffGrade`
export type AverageDiffGrade = {
  difference?: number;
  with: number;
  without: number;
};

// Fonction pour calculer la moyenne générale selon ÉcoleDirecte
const getPronoteAverage = (
  grades: Grade[],
  target: Target = "student"
): number => {
  try {
    if (!grades || grades.length === 0) return -1;

    // Grouper les notes par matière
    const groupedBySubject = grades.reduce(
      (acc: Record<string, { grades: Grade[]; coefficient: number }>, grade) => {
        const subjectKey = grade.subjectId || grade.subjectName;
        if (!acc[subjectKey]) {
          acc[subjectKey] = { grades: [], coefficient: grade.subjectCoefficient || 1 };
        }
        acc[subjectKey].grades.push(grade);
        return acc;
      },
      {}
    );

    let totalWeightedSum = 0; // Somme des moyennes pondérées par matière
    let totalCoefficient = 0; // Somme des coefficients

    // Calculer la moyenne par matière et la somme pondérée
    Object.values(groupedBySubject).forEach(({ grades: subjectGrades, coefficient }) => {
      const subjectAverage = getSubjectAverage(subjectGrades, target);
      if (subjectAverage !== -1) {
        totalWeightedSum += subjectAverage * coefficient;
        totalCoefficient += coefficient;
      }
    });

    // Retourner la moyenne générale pondérée
    return totalCoefficient === 0 ? -1 : parseFloat((totalWeightedSum / totalCoefficient).toFixed(2));
  } catch {
    return -1;
  }
};

// Fonction pour calculer la moyenne par matière selon ÉcoleDirecte
export const getSubjectAverage = (
  subject: Grade[],
  target: Target = "student"
): number => {
  try {
    let weightedSum = 0; // Somme pondérée des notes
    let totalCoefficient = 0; // Somme des coefficients

    // Parcourir chaque note pour les convertir et les pondérer
    subject.forEach((grade) => {
      const targetGrade = grade[target];
      if (
        !targetGrade ||
        targetGrade.disabled ||
        targetGrade.value === null ||
        targetGrade.value < 0 ||
        grade.coefficient === 0 ||
        typeof targetGrade.value !== "number"
      )
        return;

      // Conversion des notes sur une base de 20 si nécessaire
      const outOfValue = grade.outOf.value!;
      const normalizedValue =
        outOfValue !== 20 ? (targetGrade.value / outOfValue) * 20 : targetGrade.value;

      // Ajouter à la somme pondérée
      weightedSum += normalizedValue * grade.coefficient;
      totalCoefficient += grade.coefficient;
    });

    // Calculer la moyenne sur la base des coefficients
    if (totalCoefficient === 0) return -1;

    return parseFloat((weightedSum / totalCoefficient).toFixed(2));
  } catch {
    return -1;
  }
};

// Fonction pour calculer la différence de moyenne avec et sans certaines notes
const getAverageDiffGrade = (
  grades: Grade[],
  list: Grade[],
  target: Target = "student"
): AverageDiffGrade => {
  try {
    const baseAverage = getSubjectAverage(list, target);
    const baseWithoutGradeAverage = getSubjectAverage(
      list.filter((grade) => JSON.stringify(grades[0]) !== JSON.stringify(grade)),
      target
    );

    return {
      difference: parseFloat((baseWithoutGradeAverage - baseAverage).toFixed(2)),
      with: baseAverage,
      without: baseWithoutGradeAverage,
    };
  } catch {
    return {
      difference: 0,
      with: 0,
      without: 0,
    };
  }
};

// Fonction pour générer un historique des moyennes
const getAveragesHistory = (
  grades: Grade[],
  target: Target = "student",
  final?: number
): GradeHistory[] => {
  try {
    const history = grades.map((grade, index) => ({
      value: getPronoteAverage(grades.slice(0, index + 1), target),
      date: new Date(grade.timestamp).toISOString(),
    }));

    history.sort((a, b) => a.date.localeCompare(b.date));

    history.push({
      value: final ?? getPronoteAverage(grades, target),
      date: new Date().toISOString(),
    });

    return history.filter((x) => !isNaN(x.value));
  } catch {
    return [];
  }
};

// Export des fonctions
export { getPronoteAverage, getAverageDiffGrade, getAveragesHistory };
