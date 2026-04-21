import { Request, Response, NextFunction } from "express";
import { getUserById } from "../services/authService";
import { getCredential } from "../services/credentialService";
import {
  issueVerifiablePresentation,
  redactCredential,
  VerifiableCredential,
  verifyVerifiablePresentation,
} from "../services/vcService";
import {
  cancelRequest,
  createRequest,
  credentialMatchesRequest,
  getRequest,
  listRequestsByVerifier,
  listRequestsForHolder,
  listResponsesByHolder,
  listResponsesForRequest,
  submitResponse,
} from "../services/presentationService";

export const handleCreateRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }
    const verifier = await getUserById(req.user.id);
    const verifierDid = verifier?.did || `did:chainshield:verifier-${req.user.id}`;
    const {
      purpose,
      requiredTypes,
      requiredFields,
      targetHolderDid,
      expiresAt,
    } = req.body;

    if (!purpose || !Array.isArray(requiredTypes) || requiredTypes.length === 0) {
      res
        .status(400)
        .json({ message: "purpose and requiredTypes[] are required" });
      return;
    }

    const request = await createRequest({
      verifierUserId: req.user.id,
      verifierDid,
      verifierName: verifier?.organizationName || verifier?.email,
      purpose,
      requiredTypes,
      requiredFields,
      targetHolderDid,
      expiresAt,
    });
    res.status(201).json(request);
  } catch (e) {
    next(e);
  }
};

export const handleListMyRequests = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }
    const requests = await listRequestsByVerifier(req.user.id);
    // Attach response counts
    const enriched = await Promise.all(
      requests.map(async (r) => {
        const responses = await listResponsesForRequest(r.id);
        return { ...r, responseCount: responses.length };
      })
    );
    res.json(enriched);
  } catch (e) {
    next(e);
  }
};

export const handleGetRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const request = await getRequest(req.params.id);
    if (!request) {
      res.status(404).json({ message: "Request not found" });
      return;
    }
    res.json(request);
  } catch (e) {
    next(e);
  }
};

export const handleCancelRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }
    const ok = await cancelRequest(req.user.id, req.params.id);
    if (!ok) {
      res.status(404).json({ message: "Request not found or not yours" });
      return;
    }
    res.json({ id: req.params.id, status: "cancelled" });
  } catch (e) {
    next(e);
  }
};

export const handleInbox = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }
    const user = await getUserById(req.user.id);
    if (!user?.did) {
      res.json([]);
      return;
    }
    const requests = await listRequestsForHolder(user.did);
    res.json(requests);
  } catch (e) {
    next(e);
  }
};

export const handleMyResponses = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }
    const responses = await listResponsesByHolder(req.user.id);
    res.json(responses);
  } catch (e) {
    next(e);
  }
};

export const handleListRequestResponses = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }
    const request = await getRequest(req.params.id);
    if (!request || request.verifierUserId !== req.user.id) {
      res.status(404).json({ message: "Request not found" });
      return;
    }
    const responses = await listResponsesForRequest(req.params.id);
    res.json(responses);
  } catch (e) {
    next(e);
  }
};

/**
 * Match a holder's credentials against a request, returning the subset
 * of their credentials that can satisfy the request along with which
 * fields are required.
 */
export const handleMatchRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }
    const user = await getUserById(req.user.id);
    if (!user?.did) {
      res.json({ request: null, matches: [] });
      return;
    }
    const request = await getRequest(req.params.id);
    if (!request) {
      res.status(404).json({ message: "Request not found" });
      return;
    }
    const { getCredentialsByHolder } = await import(
      "../services/credentialService"
    );
    const creds = await getCredentialsByHolder(user.did);

    const { getUserByDid } = await import("../services/authService");

    const matchesByType: Record<
      string,
      Array<{
        credentialId: string;
        type: string;
        issuer: string;
        issuerName?: string;
        issuedAt: string;
        subjectFields: Record<string, unknown>;
        hasVc: boolean;
        requiredFields: string[];
        missingRequiredFields: string[];
      }>
    > = {};
    for (const t of request.requiredTypes) matchesByType[t] = [];

    for (const c of creds) {
      if (c.status !== "valid") continue;
      let matchedType: string | undefined;
      let missingFields: string[] = [];
      let subjectFields: Record<string, unknown> = {};
      let hasVc = false;

      if (c.vc) {
        hasVc = true;
        const vc = c.vc as VerifiableCredential;
        const result = credentialMatchesRequest(vc, request);
        if (result.matchedType) {
          matchedType = result.matchedType;
          missingFields = result.missingFields;
          subjectFields = { ...vc.credentialSubject };
          delete (subjectFields as Record<string, unknown>).id;
        }
      } else {
        // Legacy fallback: match by metadata.type
        matchedType = request.requiredTypes.find(
          (t) => c.metadata?.type === t
        );
        if (matchedType) {
          const sub = (c.metadata?.subjectFields as
            | Record<string, unknown>
            | undefined) || {
            type: c.metadata?.type,
            subjectName: c.metadata?.subjectName,
            issuedBy: c.metadata?.issuedBy,
          };
          subjectFields = { ...sub };
          const needed = request.requiredFields?.[matchedType] ?? [];
          missingFields = needed.filter((f) => !(f in subjectFields));
        }
      }

      if (!matchedType) continue;

      const issuer = await getUserByDid(c.issuerDid);
      matchesByType[matchedType].push({
        credentialId: c.credentialId,
        type: matchedType,
        issuer: c.issuerDid,
        issuerName:
          issuer?.organizationName || issuer?.email || c.metadata?.issuedBy,
        issuedAt: "",
        subjectFields,
        hasVc,
        requiredFields: request.requiredFields?.[matchedType] ?? [],
        missingRequiredFields: missingFields,
      });
    }

    const allRequiredTypesCovered = request.requiredTypes.every(
      (t) => matchesByType[t].some((c) => c.missingRequiredFields.length === 0)
    );

    res.json({ request, matchesByType, allRequiredTypesCovered });
  } catch (e) {
    next(e);
  }
};

/**
 * Holder submits a response: supply credentialId + fields to disclose.
 * Backend redacts each VC, builds a VP, signs with holder's key, saves.
 */
export const handleSubmitResponse = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }
    const user = await getUserById(req.user.id);
    if (!user?.did) {
      res.status(400).json({ message: "You need a DID to present credentials" });
      return;
    }
    const { requestId, selections, summary } = req.body as {
      requestId: string;
      selections: Array<{ credentialId: string; disclosedFields: string[] }>;
      summary?: string;
    };
    if (!requestId || !Array.isArray(selections) || selections.length === 0) {
      res
        .status(400)
        .json({ message: "requestId and at least one selection are required" });
      return;
    }

    const request = await getRequest(requestId);
    if (!request) {
      res.status(404).json({ message: "Request not found" });
      return;
    }

    const redactedVcs: VerifiableCredential[] = [];
    const disclosedFields: Record<string, string[]> = {};
    for (const sel of selections) {
      const cred = await getCredential(sel.credentialId);
      if (!cred || !cred.vc || cred.holderDid !== user.did) {
        res.status(400).json({
          message: `Credential ${sel.credentialId} is not available or not yours`,
        });
        return;
      }
      const redacted = redactCredential(
        cred.vc as VerifiableCredential,
        sel.disclosedFields
      );
      redactedVcs.push(redacted);
      disclosedFields[sel.credentialId] = sel.disclosedFields;
    }

    const vp = await issueVerifiablePresentation({
      holderUserId: req.user.id,
      holderDid: user.did,
      verifiableCredentials: redactedVcs,
      challenge: request.id,
      domain: request.verifierDid,
    });

    const saved = await submitResponse({
      requestId,
      holderUserId: req.user.id,
      holderDid: user.did,
      vp,
      disclosedFields,
      summary,
    });

    res.status(201).json(saved);
  } catch (e) {
    next(e);
  }
};

export const handleVerifyResponse = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const responses = await listResponsesForRequest(req.params.id);
    const response = responses.find((r) => r.id === req.params.responseId);
    if (!response) {
      res.status(404).json({ message: "Response not found" });
      return;
    }
    const verification = await verifyVerifiablePresentation(response.vp);
    res.json({ response, verification });
  } catch (e) {
    next(e);
  }
};
