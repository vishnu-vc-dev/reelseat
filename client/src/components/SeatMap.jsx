import { memo } from 'react';
import { Tooltip } from 'antd';
import { formatINR } from '../utils/format';

/**
 * Auditorium seat map.
 *
 * Categories are rendered top (back of the hall) to bottom with the screen
 * last, matching how customers see the hall. Aisles are inserted three
 * seats in from each side.
 *
 * @param {{
 *   layout: { seatsPerRow: number, categories: { name: string, price: number, rows: string[] }[] },
 *   booked: Set<string>, held: Set<string>, selected: Set<string>,
 *   onToggle: (seatId: string) => void, disabled?: boolean
 * }} props
 */
function SeatMap({ layout, booked, held, selected, onToggle, disabled = false }) {
  const { seatsPerRow } = layout;
  const aisleAfter = new Set([3, seatsPerRow - 3]);

  return (
    <div className="seat-map" role="grid" aria-label="Seat map">
      {layout.categories.map((category) => (
        <div className="seat-category" key={category.name}>
          <div className="seat-category-title">
            {formatINR(category.price)} {category.name.toUpperCase()}
          </div>
          {category.rows.map((row) => (
            <div className="seat-row" role="row" key={row}>
              <span className="seat-row-label">{row}</span>
              <div className="seat-row-seats">
                {Array.from({ length: seatsPerRow }, (_, i) => {
                  const number = i + 1;
                  const id = `${row}${number}`;
                  const isBooked = booked.has(id);
                  const isHeld = held.has(id);
                  const isSelected = selected.has(id);
                  const state = isBooked ? 'booked' : isHeld ? 'held' : isSelected ? 'selected' : 'available';
                  const unavailable = isBooked || isHeld;

                  return (
                    <span key={id} className="seat-slot">
                      <Tooltip title={isHeld ? 'Being booked by someone else' : `${id} · ${category.name}`} mouseEnterDelay={0.4}>
                        <button
                          type="button"
                          role="gridcell"
                          aria-label={`Seat ${id}, ${state}`}
                          aria-pressed={isSelected}
                          className={`seat ${state}`}
                          disabled={unavailable || disabled}
                          onClick={() => onToggle(id)}
                        >
                          {number}
                        </button>
                      </Tooltip>
                      {aisleAfter.has(number) && <span className="seat-aisle" aria-hidden />}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ))}

      <div className="screen" aria-hidden>
        <div className="screen-curve" />
        All eyes this way please!
      </div>

      <div className="seat-legend">
        <span>
          <i className="seat available" /> Available
        </span>
        <span>
          <i className="seat selected" /> Selected
        </span>
        <span>
          <i className="seat held" /> Being booked
        </span>
        <span>
          <i className="seat booked" /> Sold
        </span>
      </div>
    </div>
  );
}

export default memo(SeatMap);
