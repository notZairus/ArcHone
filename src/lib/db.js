import { Query } from "appwrite";

import { tablesDB } from "./appwrite.js";
import { APPWRITE_DATABASE_ID } from "../constants.js";
import { getSession } from "../utils/session.js";

export default class Database {
  //////////////////////////////
  // SAVE NEW USER TO THE USERS TABLE
  //////////////////////////////
  static async saveNewUser(userId, email, name, role) {
    await tablesDB.createRow({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: "users",
      rowId: userId,
      data: {
        email,
        name,
        role,
      },
    });
  }

  //////////////////////////////
  // SAVE ANALYSIS RESULT
  //////////////////////////////
  static async saveAnalysisResult(fileName, fileType, code, analysisResult) {
    const { userId } = await getSession();
    if (!userId) return;

    const { $id: analysisId } = await tablesDB.createRow({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: "analyses",
      rowId: "unique()",
      data: {
        userId: userId,
        fileName: fileName,
        fileType: fileType,
        code: code,
      },
    });

    const comments = analysisResult.comments || [];
    const variables = analysisResult.variables || [];
    const functions = analysisResult.functions || [];
    const issues = analysisResult.issues || [];

    await new Promise.all([
      saveComments(analysisId, comments),
      saveVariables(analysisId, variables),
      saveFunctions(analysisId, functions),
      saveIssues(analysisId, issues),
    ]);
  }

  //////////////////////////////
  // FETCH AUTHENTICATED USER ANALYSES
  //////////////////////////////
  static async getUserAnalyses(userId) {
    const analyses = await tablesDB.listRows({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: "analyses",
      queries: [Query.equal("userId", userId)],
    });

    const formattedAnalyses = analyses.rows.map((analysis) => ({
      id: analysis.$id,
      fileName: analysis.fileName,
      fileType: analysis.fileType,
      createdAt: analysis.$createdAt,
      updatedAt: analysis.$updatedAt,
    }));

    const properties = ["comments", "issues", "functions", "variables"];

    const formattedAnalysesWithProperties = await Promise.all(
      formattedAnalyses.map(async (analysis) => {
        const analysisId = analysis.id;
        const propertiesData = {};

        for (const property of properties) {
          propertiesData[property] = await getAnalysisProperty(
            property,
            analysisId,
          );
        }

        return {
          ...analysis,
          ...propertiesData,
        };
      }),
    );

    return formattedAnalysesWithProperties;
  }

  //////////////////////////////
  // GET USER BY ID
  //////////////////////////////
  static async getUserById(userId) {
    const user = await tablesDB.getRow({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: "users",
      rowId: userId,
    });

    if (!user) {
      return null;
    }

    return user;
  }

  //////////////////////////////
  // GET CLASSROOM
  //////////////////////////////
  static async getClassroomsByUserId(userId) {
    const resultAccepted = await tablesDB.listRows({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: "classroom_user",
      queries: [Query.equal("userId", userId), Query.equal("accepted", true)],
    });

    const resultPending = await tablesDB.listRows({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: "classroom_user",
      queries: [Query.equal("userId", userId), Query.equal("accepted", false)],
    });

    const classroomIdsAccepted = resultAccepted.rows.map(
      (row) => row.classroomId,
    );

    const classroomIdsPending = resultPending.rows.map(
      (row) => row.classroomId,
    );

    const classrooms = [];

    for (const classroomId of classroomIdsAccepted) {
      const classroomResultAccepted = await tablesDB.getRow({
        databaseId: APPWRITE_DATABASE_ID,
        tableId: "classrooms",
        rowId: classroomId,
      });

      if (classroomResultAccepted) {
        classroomResultAccepted.accepted = true;
        classrooms.push(classroomResultAccepted);
      }
    }

    for (const classroomId of classroomIdsPending) {
      const classroomResultPending = await tablesDB.getRow({
        databaseId: APPWRITE_DATABASE_ID,
        tableId: "classrooms",
        rowId: classroomId,
      });

      if (classroomResultPending) {
        classroomResultPending.accepted = false;
        classrooms.push(classroomResultPending);
      }
    }

    return classrooms;
  }

  //////////////////////////////
  // JOIN CLASSROOM
  //////////////////////////////
  static async joinClassroom(userId, classroomCode) {
    const classrooms = await tablesDB.listRows({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: "classrooms",
      queries: [Query.equal("code", classroomCode)],
    });

    if (classrooms.total === 0) {
      throw new Error("Invalid classroom code.");
    }

    const classroom = classrooms.rows[0];

    await tablesDB.createRow({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: "classroom_user",
      rowId: "unique()",
      data: {
        userId,
        classroomId: classroom.$id,
        accepted: false,
      },
    });

    return true;
  }

  //////////////////////////////
  // GET CLASSROOM_USER
  //////////////////////////////

  static async getClassroomByCode(classroomCode) {
    const result = await tablesDB.listRows({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: "classrooms",
      queries: [Query.equal("code", classroomCode)],
    });

    if (result.total === 0) {
      return null;
    }

    return result.rows[0];
  }

  static async getClassroomUser(userId, classroomId) {
    const row = await tablesDB.listRows({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: "classroom_user",
      queries: [
        Query.equal("userId", userId),
        Query.equal("classroomId", classroomId),
      ],
    });

    return row.rows[0];
  }
}

// ========================== Helper functions ========================== //

async function saveComments(analysisId, comments) {
  for (const comment of comments) {
    await tablesDB.createRow({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: "comments",
      rowId: "unique()",
      data: {
        analysisId: analysisId,
        text: comment.text,
        line: comment.line,
        code: comment.code,
      },
    });
  }
}

async function saveVariables(analysisId, variables) {
  for (const variable of variables) {
    await tablesDB.createRow({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: "variables",
      rowId: "unique()",
      data: {
        analysisId: analysisId,
        name: variable.name,
        kind: variable.kind,
        dataType: variable.dataType,
        line: variable.line,
        code: variable.code,
        skipUnusedCheck: variable.skipUnusedCheck ?? true,
        scopeKey: variable.scopeKey,
        isExported: variable.isExported,
      },
    });
  }
}

async function saveFunctions(analysisId, funcs) {
  for (const func of funcs) {
    await tablesDB.createRow({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: "functions",
      rowId: "unique()",
      data: {
        analysisId: analysisId,
        name: func.name,
        lines: func.lines,
        parameterCount: func.parameterCount,
        complexity: func.complexity,
        maxNesting: func.maxNesting,
        line: func.line,
        code: func.code,
        bodyCode: func.bodyCode,
      },
    });
  }
}

async function saveIssues(analysisId, issues) {
  for (const issue of issues) {
    await tablesDB.createRow({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: "issues",
      rowId: "unique()",
      data: {
        analysisId: analysisId,
        title: issue.title,
        type: issue.type,
        line: issue.line,
        message: issue.message,
        suggestion: issue.suggestion,
        why: issue.why,
        functionName: issue.functionName,
        functionLines: issue.functionLines,
        code: issue.code,
      },
    });
  }
}

function sanitizeDataForTable(tableId, data) {
  if (tableId !== "issues") {
    return data;
  }

  const { principle, ...dbCompatibleIssue } = data;
  return dbCompatibleIssue;
}

async function getAnalysisProperty(tableId, analysisId) {
  const properties = await tablesDB.listRows({
    databaseId: APPWRITE_DATABASE_ID,
    tableId,
    queries: [Query.equal("analysisId", analysisId)],
  });

  return properties.rows.map((property) => ({
    id: property.$id,
    ...property,
  }));
}
