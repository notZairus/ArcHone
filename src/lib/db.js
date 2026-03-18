import { tablesDB } from "./appwrite.js";
import { APPWRITE_DATABASE_ID } from "../constants.js";
import { getSession } from "../utils/session.js";

export default class Database {
  static async saveAnalysisResult(fileName, fileType, analysisResult) {
    const { userId } = await getSession();
    if (!userId) return;

    const { $id: analysisId } = await tablesDB.createRow({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: "analyses",
      rowId: "unique()",
      data: {
        user_id: userId,
        file_name: fileName,
        file_type: fileType,
      },
    });

    for (const func of analysisResult.functions) {
      await saveFunction(func, analysisId);
    }

    for (const comment of analysisResult.comments) {
      await saveComments(comment, analysisId);
    }

    for (const variable of analysisResult.variables) {
      await saveVariables(variable, analysisId);
    }

    for (const issue of analysisResult.issues) {
      await saveIssues(issue, analysisId);
    }
  }
}

async function saveFunction(func, analysisId) {
  await tablesDB.createRow({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: "functions",
    rowId: "unique()",
    data: {
      analysis_id: analysisId,
      name: func.name,
      line: func.line,
      lines: func.lines,
      parameter_count: func.parameterCount,
      complexity: func.complexity,
      max_nesting: func.maxNesting,
    },
  });
}

async function saveComments(comment, analysisId) {
  await tablesDB.createRow({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: "comments",
    rowId: "unique()",
    data: {
      analysis_id: analysisId,
      text: comment.text,
      line: comment.line,
    },
  });
}

async function saveVariables(variable, analysisId) {
  await tablesDB.createRow({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: "variables",
    rowId: "unique()",
    data: {
      analysis_id: analysisId,
      name: variable.name,
      line: variable.line,
      kind: variable.kind,
      data_type: variable.dataType,
    },
  });
}

async function saveIssues(issue, analysisId) {
  await tablesDB.createRow({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: "issues",
    rowId: "unique()",
    data: {
      analysis_id: analysisId,
      title: issue.title,
      type: issue.type,
      line: issue.line,
      message: issue.message,
      suggestion: issue.suggestion,
      why: issue.why,
    },
  });
}
