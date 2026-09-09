import { Query } from "appwrite";

import { tablesDB } from "./appwrite.js";
import { APPWRITE_DATABASE_ID } from "../constants.js";
import { getSession } from "../utils/session.js";
import { log } from "../utils/helpers.js";

const MAX_ROWS_LIMIT = 500;

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
        mode: analysisResult.mode || "general",
      },
    });

    const comments = analysisResult.comments || [];
    const variables = analysisResult.variables || [];
    const functions = analysisResult.functions || [];
    const issues = analysisResult.issues || [];

    await Promise.all([
      saveComments(analysisId, comments),
      saveVariables(analysisId, variables),
      saveFunctions(analysisId, functions),
      saveIssues(analysisId, issues),
    ]);
  }

  //////////////////////////////
  // SAVE COMPLEXITY ANALYSIS RESULT
  //////////////////////////////
  static async saveComplexityAnalysisResult({
    fileName,
    fileType,
    code,
    complexityResult,
  }) {
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
        mode: complexityResult.mode || "complexity",
      },
    });

    for (const func of complexityResult.complexitySummary.functions) {
      try {
        const { $id: complexityId } = await tablesDB.createRow({
          databaseId: APPWRITE_DATABASE_ID,
          tableId: "complexities",
          rowId: "unique()",
          data: {
            analysisId,
            name: func.name,
            line: func.line,
            code: func.code,
          },
        });

        await tablesDB.createRow({
          databaseId: APPWRITE_DATABASE_ID,
          tableId: "tcomplexities",
          rowId: "unique()",
          data: {
            complexityId,
            estimate: func.time.estimate,
            exponent: func.time.exponent || 0,
            class: func.time.class,
            confidence: func.time.confidence,
          },
        });

        await tablesDB.createRow({
          databaseId: APPWRITE_DATABASE_ID,
          tableId: "scomplexities",
          rowId: "unique()",
          data: {
            complexityId,
            estimate: func.space.estimate,
            class: func.space.class,
            confidence: func.space.confidence,
          },
        });

        console.log("Finished:", func.name);
      } catch (error) {
        console.error(`Failed to save function: ${func.name}`);
        console.error(error);
      }
    }
  }

  //////////////////////////////
  // FETCH AUTHENTICATED USER ANALYSES
  //////////////////////////////
  static async getUserAnalyses(userId, order = "asc") {
    const analyses = await tablesDB.listRows({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: "analyses",
      queries: [
        Query.equal("userId", userId),
        order === "asc"
          ? Query.orderAsc("$createdAt")
          : Query.orderDesc("$createdAt"),
        Query.limit(MAX_ROWS_LIMIT),
      ],
    });

    const formattedAnalyses = analyses.rows.map((analysis) => ({
      id: analysis.$id,
      mode: analysis.mode,
      code: analysis.code,
      fileName: analysis.fileName,
      fileType: analysis.fileType,
      createdAt: analysis.$createdAt,
      updatedAt: analysis.$updatedAt,
    }));

    const properties = ["comments", "issues", "functions", "variables"];

    const formattedAnalysesWithProperties = await Promise.all(
      formattedAnalyses.map(async (analysis) => {
        if (analysis.mode !== "complexity") {
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
        } else {
          const analysisId = analysis.id;

          const functions = await tablesDB.listRows({
            databaseId: APPWRITE_DATABASE_ID,
            tableId: "complexities",
            queries: [
              Query.equal("analysisId", analysisId),
              Query.limit(MAX_ROWS_LIMIT),
            ],
          });

          console.log("functions done");

          const fnWithTimeSpaceComplexity = await Promise.all(
            functions.rows.map(async (func) => {
              const functionId = func.$id;

              const timeComp = await tablesDB.listRows({
                databaseId: APPWRITE_DATABASE_ID,
                tableId: "tcomplexities",
                queries: [
                  Query.equal("complexityId", functionId),
                  Query.limit(MAX_ROWS_LIMIT),
                ],
              });

              const spaceComp = await tablesDB.listRows({
                databaseId: APPWRITE_DATABASE_ID,
                tableId: "scomplexities",
                queries: [
                  Query.equal("complexityId", functionId),
                  Query.limit(MAX_ROWS_LIMIT),
                ],
              });

              return {
                ...func,
                space: spaceComp.rows[0],
                time: timeComp.rows[0],
              };
            }),
          );

          const toReturn = {
            ...analysis,
            complexitySummary: {
              functions: fnWithTimeSpaceComplexity,
            },
          };

          return toReturn;
        }
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
      queries: [
        Query.equal("userId", userId),
        Query.equal("accepted", true),
        Query.limit(MAX_ROWS_LIMIT),
      ],
    });

    const resultPending = await tablesDB.listRows({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: "classroom_user",
      queries: [
        Query.equal("userId", userId),
        Query.equal("accepted", false),
        Query.limit(MAX_ROWS_LIMIT),
      ],
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
      queries: [
        Query.equal("code", classroomCode),
        Query.limit(MAX_ROWS_LIMIT),
      ],
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
  // GET CLASSROOM USING CLASSROOM CODE
  //////////////////////////////
  static async getClassroomByCode(classroomCode) {
    const result = await tablesDB.listRows({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: "classrooms",
      queries: [
        Query.equal("code", classroomCode),
        Query.limit(MAX_ROWS_LIMIT),
      ],
    });

    if (result.total === 0) {
      return null;
    }

    return result.rows[0];
  }

  //////////////////////////////
  // GET CLASSROOM_USER
  //////////////////////////////
  static async getClassroomUser(userId, classroomId) {
    const row = await tablesDB.listRows({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: "classroom_user",
      queries: [
        Query.equal("userId", userId),
        Query.equal("classroomId", classroomId),
        Query.limit(MAX_ROWS_LIMIT),
      ],
    });

    return row.rows[0];
  }

  static async getFeedbacks(analysisId) {
    const row = await tablesDB.listRows({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: "6a994862001659d9de4d",
      queries: [
        Query.equal("analysisId", analysisId),
        Query.limit(MAX_ROWS_LIMIT),
      ],
    });

    return row.rows;
  }

  static async getFeedbacksByFileName(fileName) {
    const row = await tablesDB.listRows({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: "6a994862001659d9de4d",
      queries: [Query.equal("fileName", fileName), Query.limit(MAX_ROWS_LIMIT)],
    });

    return row.rows;
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
async function getAnalysisProperty(tableId, analysisId) {
  const properties = await tablesDB.listRows({
    databaseId: APPWRITE_DATABASE_ID,
    tableId,
    queries: [
      Query.equal("analysisId", analysisId),
      Query.limit(MAX_ROWS_LIMIT),
    ],
  });

  return properties.rows.map((property) => ({
    id: property.$id,
    ...property,
  }));
}
