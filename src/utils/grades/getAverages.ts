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

// Fonction pour calculer la moyenne des notes globales par matière, en fonction de la cible (par défaut, "student")
const getPronoteAverage = (
  grades: Grade[],
  target: Target = "student",
  useMath: boolean = false
): number => {
  console.log("[getPronoteAverage] Calculating overall average", { target, useMath });

  try {
    if (!grades || grades.length === 0) {
      console.warn("[getPronoteAverage] No grades provided");
      return -1;
    }

    const groupedBySubject = grades.reduce(
      (acc: Record<string, Grade[]>, grade) => {
        (acc[grade.subjectId || grade.subjectName] ||= []).push(grade);
        return acc;
      },
      {}
    );

    let countedSubjects = 0;

    const totalAverage = Object.values(groupedBySubject).reduce(
      (acc, subjectGrades) => {
        const nAvg = getSubjectAverage(subjectGrades, target, useMath);

        if (nAvg !== -1) {
          countedSubjects++;
        } else {
          console.warn("[getPronoteAverage] Invalid subject average", { subjectGrades });
          return acc;
        }

        return acc + nAvg;
      },
      0
    );

    const overallAverage = countedSubjects > 0 ? totalAverage / countedSubjects : -1;
    console.log("[getPronoteAverage] Overall average calculated", { overallAverage });
    return overallAverage;
  } catch (e) {
    console.error("[getPronoteAverage] Error calculating average", e);
    return -1;
  }
};

// Fonction pour calculer la moyenne d'une matière spécifique, selon la cible choisie
export const getSubjectAverage = (
  subject: Grade[],
  target: Target = "student",
  useMath: boolean = false,
  loop: boolean = false
): number => {
  console.log("[getSubjectAverage] Calculating subject average", { target, useMath });

  try {
    let calcGradesSum = 0;
    let calcOutOfSum = 0;
    let countedGrades = 0;

    for (const grade of subject) {
      const targetGrade = grade[target];

      if (
        !targetGrade ||
        targetGrade.disabled ||
        targetGrade.value === null ||
        targetGrade.value < 0 ||
        grade.coefficient === 0 ||
        typeof targetGrade.value !== "number"
      ) {
        console.warn("[getSubjectAverage] Skipping invalid grade", { grade });
        continue;
      }

      const coefficient = grade.coefficient;
      const outOfValue = grade.outOf.value!;

      if (grade.isOptional && !loop) {
        const avgWithout = getSubjectAverage(
          subject.filter((g) => JSON.stringify(g) !== JSON.stringify(grade)),
          target,
          useMath,
          true
        );

        const avgWith = getSubjectAverage(subject, target, useMath, true);

        if (avgWithout > avgWith) {
          console.info("[getSubjectAverage] Optional grade excluded", { grade });
          continue;
        }
      }

      if (grade.isBonus) {
        const averageMoy = outOfValue / 2;
        const newGradeValue = targetGrade.value - averageMoy;

        if (newGradeValue < 0) continue;

        calcGradesSum += newGradeValue;
        calcOutOfSum += 1;
      } else if (useMath) {
        calcGradesSum += targetGrade.value * coefficient;
      } else if (
        targetGrade.value > 20 ||
        (coefficient < 1 && outOfValue - 20 >= -5) ||
        outOfValue > 20
      ) {
        const gradeOn20 = (targetGrade.value / outOfValue) * 20;
        calcGradesSum += gradeOn20 * coefficient;
        calcOutOfSum += 20 * coefficient;
      } else {
        calcGradesSum += targetGrade.value * coefficient;
        calcOutOfSum += outOfValue * coefficient;
      }

      countedGrades += useMath ? coefficient : 1;
    }

    const subjectAverage =
      calcOutOfSum === 0 ? -1 : Math.min((calcGradesSum / calcOutOfSum) * 20, 20);
    console.log("[getSubjectAverage] Subject average calculated", { subjectAverage });
    return isNaN(subjectAverage) ? -1 : subjectAverage;
  } catch (e) {
    console.error("[getSubjectAverage] Error calculating subject average", e);
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
  console.log("[getAverageDiffGrade] Calculating average difference", { target });

  try {
    const baseAverage = getSubjectAverage(list, target);
    const baseWithoutGradeAverage = getSubjectAverage(
      list.filter((grade) => JSON.stringify(grades[0]) !== JSON.stringify(grade)),
      target,
      useMath
    );

    const result = {
      difference: baseWithoutGradeAverage - baseAverage,
      with: baseAverage,
      without: baseWithoutGradeAverage,
    };
    console.log("[getAverageDiffGrade] Average difference calculated", { result });
    return result;
  } catch (e) {
    console.error("[getAverageDiffGrade] Error calculating average difference", e);
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
  console.log("[getAveragesHistory] Generating averages history", { target });

  try {
    const history = grades.map((grade, index) => ({
      value: getPronoteAverage(grades.slice(0, index + 1), target),
      date: new Date(grade.timestamp).toISOString(),
    }));

    history.sort((a, b) => a.date.localeCompare(b.date));

    history.push({
      value: final ?? getPronoteAverage(grades, target, useMath),
      date: new Date().toISOString(),
    });

    const filteredHistory = history.filter((x) => !isNaN(x.value));
    console.log("[getAveragesHistory] Averages history generated", { filteredHistory });
    return filteredHistory;
  } catch (e) {
    console.error("[getAveragesHistory] Error generating averages history", e);
    return [];
  }
};

// Exportation des fonctions pour utilisation externe
export { getPronoteAverage, getAverageDiffGrade, getAveragesHistory };
