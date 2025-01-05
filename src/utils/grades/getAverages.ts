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
  try {
    // Si aucune note n'est fournie ou que la liste est vide, on retourne -1
    if (!grades || grades.length === 0) return -1;

    // Grouper les notes par matière
    const groupedBySubject = grades.reduce(
      (acc: Record<string, Grade[]>, grade) => {
        (acc[grade.subjectId || grade.subjectName] ||= []).push(grade); // Ajouter la note à la liste des notes pour la matière correspondante
        return acc;
      },
      {}
    );

    let countedSubjects = 0; // Compteur des matières pour lesquelles une moyenne est calculée

    // Calculer la moyenne totale de toutes les matières
    const totalAverage = Object.values(groupedBySubject).reduce(
      (acc, subjectGrades) => {
        const nAvg = getSubjectAverage(subjectGrades, target, useMath); // Moyenne par matière

        if (nAvg !== -1) {
          countedSubjects++; // Incrémenter le compteur si la moyenne est valide
        } else {
          return acc;
        }

        return acc + nAvg; // Ajouter la moyenne au total
      },
      0
    );

    // Retourner la moyenne globale en divisant par le nombre de matières
    return totalAverage / countedSubjects;
  } catch (e) {
    console.error("Erreur dans getPronoteAverage:", e);
    return -1; // En cas d'erreur, retourner -1
  }
};

// Fonction pour calculer la moyenne d'une matière spécifique, selon la cible choisie
export const getSubjectAverage = (
  subject: Grade[],
  target: Target = "student",
  useMath: boolean = false,
  loop: boolean = false
): number => {
  try {
    let calcGradesSum = 0; // Somme cumulée des notes pondérées
    let calcOutOfSum = 0; // Somme cumulée des coefficients pondérés
    let countedGrades = 0; // Compteur des notes utilisées

    // Parcourir chaque note de la matière
    for (const grade of subject) {
      const targetGrade = grade[target]; // Sélectionner la note selon la cible choisie

      // Vérifier si la note est invalide ou si le coefficient est nul, et passer à la suivante si c'est le cas
      if (
        !targetGrade ||
        targetGrade.disabled ||
        targetGrade.value === null ||
        targetGrade.value < 0 ||
        grade.coefficient === 0 ||
        typeof targetGrade.value !== "number"
      )
        continue;

      const coefficient = grade.coefficient; // Coefficient de la note
      const outOfValue = grade.outOf.value!; // Valeur maximale possible pour la note

      // Si la note est optionnelle et qu'on ne boucle pas
      if (grade.isOptional && !loop) {
        const avgWithout = getSubjectAverage(
          subject.filter((g) => JSON.stringify(g) !== JSON.stringify(grade)),
          target,
          useMath,
          true
        ); // Moyenne sans cette note

        const avgWith = getSubjectAverage(subject, target, useMath, true); // Moyenne avec cette note

        if (avgWithout > avgWith) {
          continue; // Ignorer si la moyenne sans est meilleure
        }
      }

      // Si la note est un bonus
      if (grade.isBonus) {
        const averageMoy = outOfValue / 2; // Calculer la moitié de la valeur maximale comme seuil de bonus
        const newGradeValue = targetGrade.value - averageMoy; // Ajuster la note en soustrayant la moitié de la valeur maximale

        if (newGradeValue < 0) continue; // Si la note ajustée est négative, passer à la suivante

        calcGradesSum += newGradeValue; // Ajouter la note ajustée à la somme
        calcOutOfSum += 1; // Incrémenter la somme de pondération (compte comme 1 ici)
      } else if (useMath) {
        calcGradesSum += targetGrade.value * coefficient; // Ajouter la note pondérée
      } else if (
        targetGrade.value > 20 ||
        (coefficient < 1 && outOfValue - 20 >= -5) ||
        outOfValue > 20
      ) {
        const gradeOn20 = (targetGrade.value / outOfValue) * 20; // Ajuster la note pour une base sur 20
        calcGradesSum += gradeOn20 * coefficient; // Ajouter la note ajustée et pondérée
        calcOutOfSum += 20 * coefficient; // Ajouter le coefficient ajusté à la somme
      } else {
        calcGradesSum += targetGrade.value * coefficient; // Ajouter la note pondérée
        calcOutOfSum += outOfValue * coefficient; // Ajouter le coefficient pondéré à la somme
      }

      // Compter les notes selon l'approche mathématique ou standard
      countedGrades += useMath ? 1 * coefficient : 1;
    }

    // Retourner la moyenne calculée avec l'approche mathématique
    if (useMath) {
      return calcGradesSum / countedGrades;
    }

    // Si aucune somme de pondération n'est calculée, retourner -1
    if (calcOutOfSum === 0) return -1;

    // Calculer la moyenne de la matière
    const subjectAverage = Math.min((calcGradesSum / calcOutOfSum) * 20, 20); // Ajuster pour ne pas dépasser 20
    return isNaN(subjectAverage) ? -1 : subjectAverage; // Retourner la moyenne calculée
  } catch (e) {
    console.error("Erreur dans getSubjectAverage:", e);
    return -1; // En cas d'erreur, retourner -1
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
    const baseAverage = getSubjectAverage(list, target); // Moyenne de base
    const baseWithoutGradeAverage = getSubjectAverage(
      list.filter((grade) => JSON.stringify(grades[0]) !== JSON.stringify(grade)),
      target,
      useMath
    ); // Moyenne sans certaines notes

    return {
      difference: baseWithoutGradeAverage - baseAverage, // Différence entre les deux moyennes
      with: baseAverage, // Moyenne avec toutes les notes
      without: baseWithoutGradeAverage, // Moyenne sans certaines notes
    };
  } catch (e) {
    console.error("Erreur dans getAverageDiffGrade:", e);
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
    // Générer l'historique des moyennes jusqu'à la date de chaque note
    const history = grades.map((grade, index) => ({
      value: getPronoteAverage(grades.slice(0, index + 1), target), // Moyenne jusqu'à ce point
      date: new Date(grade.timestamp).toISOString(), // Date de la note au format ISO
    }));

    // Trier l'historique par date
    history.sort((a, b) => a.date.localeCompare(b.date));

    // Ajouter un point final avec la moyenne finale (ou calculée)
    history.push({
      value: final ?? getPronoteAverage(grades, target, useMath), // Moyenne finale ou calculée
      date: new Date().toISOString(), // Date actuelle
    });

    // Retirer les valeurs NaN
    return history.filter((x) => !isNaN(x.value));
  } catch (e) {
    console.error("Erreur dans getAveragesHistory:", e);
    return []; // En cas d'erreur, retourner un tableau vide
  }
};

// Exportation des fonctions pour utilisation externe
export { getPronoteAverage, getAverageDiffGrade, getAveragesHistory };
