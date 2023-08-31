import { expect, test } from 'vitest'
import { render, screen } from '@testing-library/react';
import App from '../App';
import userEvent from '@testing-library/user-event'

/**
 * @vitest-environment jsdom
 */

test('Should be 3', () => {
  expect(1 +2 ).toBe(3);
});

test('Should click on count button and increase count number', async () => {
  render(<App/>);
  await userEvent.click(screen.getByText('count is 0'));
  expect(screen.getByText('count is 1')).toBeDefined();
})

test('Should be 4', () => {
  expect(2 + 2 ).toBe(4);
});