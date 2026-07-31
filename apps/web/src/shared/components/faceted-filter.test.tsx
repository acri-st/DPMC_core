import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { FacetedFilter } from './faceted-filter';

function Harness() {
  const [selected, setSelected] = useState<string[]>([]);
  return (
    <FacetedFilter
      label="Status"
      options={[
        { value: 'Running', label: 'Running' },
        { value: 'Done', label: 'Done' },
      ]}
      selected={selected}
      onChange={setSelected}
    />
  );
}

describe('FacetedFilter', () => {
  it('toggles values and shows the selected count', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: /status/i }));
    await user.click(screen.getByRole('option', { name: 'Running' }));
    await user.click(screen.getByRole('option', { name: 'Done' }));

    expect(screen.getByText('2')).toBeInTheDocument();

    await user.click(screen.getByRole('option', { name: 'Running' }));
    expect(screen.getByText('1')).toBeInTheDocument();
  });
});
