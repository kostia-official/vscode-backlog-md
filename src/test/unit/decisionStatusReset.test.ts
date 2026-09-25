import { describe, it, expect, vi } from 'vitest';
import * as vscode from 'vscode';
import { ContentDetailProvider } from '../../providers/ContentDetailProvider';
import type { BacklogParser } from '../../core/BacklogParser';

describe('ContentDetailProvider decision status update', () => {
  it('re-renders the decision when the write fails, so the select shows the status on disk', async () => {
    const provider = new ContentDetailProvider(
      vscode.Uri.file('/ext'),
      {} as unknown as BacklogParser
    );
    const internals = provider as unknown as {
      writer: { updateDecision: unknown };
      updateDecisionStatus(id: unknown, status: unknown): Promise<void>;
    };
    internals.writer.updateDecision = vi.fn().mockRejectedValue(new Error('disk full'));
    const openDecision = vi.spyOn(provider, 'openDecision').mockResolvedValue();

    await internals.updateDecisionStatus('decision-1', 'accepted');

    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
      'Failed to update decision status: Error: disk full'
    );
    expect(openDecision).toHaveBeenCalledWith('decision-1');
  });
});
