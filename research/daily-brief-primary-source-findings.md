# Daily Brief and Reading Record: primary-source findings

Research checked 2026-08-05. This note grounds the Daily Brief standard in current official guidance. It is an operating-safety synthesis for a private learning record, not legal advice.

## Findings

### 1. Source role and authority are claim-specific

The Library of Congress distinguishes a primary source as a firsthand or original record from a secondary source that later summarizes, analyzes, or interprets. The distinction is about a source's relationship to the claim, not a universal quality rank. The Association of College and Research Libraries likewise says authority depends on the information need and context; format or credentials alone do not settle credibility. ([Library of Congress](https://ask.loc.gov/faq/303148); [ACRL Framework](https://www.ala.org/acrl/standards/ilframework))

**Implication:** Label a selection `primary`, `secondary`, or `mixed` relative to the claim it supports. Prefer the relevant first-party artifact for what an actor said, filed, released, measured, or changed; use independent secondary work for interpretation, comparison, and context. A company announcement is direct evidence of the announcement, not independent proof that every claim in it is true. Record the issuer's interest and seek independent corroboration for material promotional claims.

### 2. Dates describe different events

Official metadata standards keep dates distinct. DataCite separately defines dates such as `Created`, `Issued`, and `Updated`; its own support guidance warns that a record's system “last updated” timestamp can change for internal reasons and need not mean the resource changed. Library of Congress citation guidance calls for a publication date when available and recommends an access date for online sources; when publication information is absent, it says to provide what is available rather than inventing it. ([DataCite date types](https://datacite-metadata-schema.readthedocs.io/en/4.7/appendices/appendix-1/dateType/); [DataCite timestamp caveat](https://support.datacite.org/docs/what-does-the-doi-last-updated-mean); [Library of Congress citation guidance](https://www.loc.gov/programs/teachers/getting-started-with-primary-sources/citing/mla/))

**Implication:** Store `published_at`, `updated_at`, `accessed_at`, and `archived_at` separately. Copy publication and update dates only when the source explicitly identifies them; otherwise record `not stated`. Do not use a footer copyright year, search-result timestamp, DOI-registration timestamp, or archive-capture time as a substitute. Record a version or amendment label when the source supplies one.

### 3. A persistent identifier preserves identity, not truth or access

The DOI Foundation describes a DOI as an identifier independent of an object's changing location; persistence still depends on the registrant maintaining the DOI record. Crossref recommends displaying DOI links as full `https://doi.org/...` URLs so the destination can be updated when content moves. DOI metadata may resolve only to a landing page, including when the full text is restricted. ([DOI Handbook](https://www.doi.org/doi-handbook/html/); [Crossref display guidelines](https://www.crossref.org/display-guidelines); [Crossref landing-page guidance](https://www.crossref.org/documentation/member-setup/creating-a-landing-page/))

**Implication:** Preserve a canonical DOI URL whenever one exists, along with the human-readable citation and original landing-page URL. Treat the DOI as a durable identity aid, never as evidence that the work is accurate, current, peer reviewed, or openly accessible.

### 4. Web archives are useful but incomplete

Internet Archive's Save Page Now saves one requested page and warns that some sites or technical configurations cannot be captured. The Library of Congress says current tools cannot fully preserve some multimedia-rich, streaming, deep-web, database-driven, password-protected, or paywalled content. It recommends exposing the archiving institution, capture time, and archive-functionality limitations when displaying a capture. Perma.cc similarly preserves only the targeted page, does not follow embedded links, and disclaims guaranteed permanence; its terms limit user-submitted content to material freely available without payment or registration. ([Internet Archive](https://archivesupport.zendesk.com/hc/en-us/articles/360001513491-Save-Pages-in-the-Wayback-Machine); [Library of Congress format guidance](https://www.loc.gov/preservation/resources/rfs/webarchives.html); [Perma.cc FAQ](https://perma.cc/docs/faq); [Perma.cc terms](https://perma.cc/terms-of-service))

**Implication:** For a public, mutable, non-sensitive page, keep the original URL and—when lawfully created—an archive URL and capture timestamp. Treat the archive as supporting evidence, not a complete copy. Never submit paywalled, authenticated, confidential, local, or learner-sensitive material to a public archiving service. If external archiving would reveal a sensitive research trail, preserve only local metadata in the Private Learning Record.

### 5. Educational purpose does not create a blanket copying right

The U.S. Copyright Office explains that fair use is a case-specific balance of purpose, nature, amount, and market effect. Nonprofit education can favor fair use, but not every educational use is fair, and there is no fixed safe word count or percentage. Section 1201 separately prohibits circumventing a technological measure that controls access, subject to narrow statutory and periodically adopted exceptions. ([U.S. Copyright Office fair-use guidance](https://www.copyright.gov/fair-use/more-info.html); [17 U.S.C. chapter 12](https://www.copyright.gov/title17/92chap12.html))

**Implication:** The Reading Record should store bibliographic metadata, links, the learner's original synthesis, and only the minimum quotation needed for a concrete teaching purpose. Do not copy full articles, PDFs, images, charts, or newsletters merely because the Lab is private or educational. Do not bypass a paywall or access control. A public-facing Portfolio Artifact requires a new rights and confidentiality review; private inclusion is not publication permission.

### 6. Access and attribution must be explicit

Library of Congress citation guidance includes author, title, publisher, publication date, DOI or URL, and online access date. Creative Commons recommends retaining Title, Author, Source, and License for licensed reuse and identifying changes; the precise license and version matter. ([Library of Congress](https://www.loc.gov/programs/teachers/getting-started-with-primary-sources/citing/mla/); [Creative Commons reuse guidance](https://creativecommons.org/reusing-cc-licensed-content/); [CC BY 4.0 deed](https://creativecommons.org/licenses/by/4.0/deed.en))

**Implication:** Always attribute editorially. When reuse depends on a license, record the exact license/version and follow its conditions. Do not infer a Creative Commons license or public-domain status from free access. Attribution identifies provenance; it does not by itself grant permission to reproduce.

## Safe requirements for the private learning record

Each Daily Brief selection should preserve, at minimum:

- Brief date, lane, and stated teaching purpose.
- Author or issuing entity, title, publisher, and source format.
- Claim-relative source role: `primary`, `secondary`, or `mixed`.
- The specific claim or question the source is meant to inform, plus issuer-interest or bias notes where material.
- Publication, update, access, and archive dates as separate fields, with `not stated` rather than inferred dates.
- Original URL, canonical DOI or other persistent identifier when available, and optional lawful archive URL.
- Access state: `open`, `institutional or learner-authorized`, `account required`, `paywalled`, or `unavailable`.
- Material actually reviewed: `full text`, `excerpt`, `abstract`, or `metadata only`. An inaccessible source cannot be marked read or summarized beyond the material actually reviewed.
- Rights state: explicit license/version, public-domain statement, permission, ordinary copyright, or `not stated`.
- Original learner response and later usefulness notes as dated append-only entries.

These requirements imply four curation gates:

1. **Fit:** The source must serve one Daily Brief lane and one explicit teaching purpose; prestige alone is insufficient.
2. **Traceability:** The learner must be able to identify who made the claim, when, in what version, and with what interest.
3. **Access honesty:** A DOI, abstract, preview, or headline does not count as full-text review. Unavailable selections remain historically visible with their status.
4. **Rights and preservation safety:** Link and synthesize by default; quote minimally; archive only public, non-sensitive pages and disclose capture limits.

For deduplication, use the DOI or other persistent identifier first, then canonical URL and normalized title. A materially revised edition may be selected again only as a new version with a new teaching purpose; the earlier Reading Record entry remains unchanged.
