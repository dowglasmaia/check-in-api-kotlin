import { formatDate } from '@angular/common';
import { Pipe, PipeTransform } from '@angular/core';

export type FlightTimeFormat = 'time' | 'day' | 'date' | 'opens';

const FORMATS: Record<FlightTimeFormat, string> = {
  time: 'HH:mm',
  day: 'EEE, d MMM',
  date: 'EEE, d MMM y',
  opens: "d MMM 'at' HH:mm",
};

/** Formats an instant in the device's time zone (the API sends UTC). */
@Pipe({ name: 'flightTime' })
export class FlightTimePipe implements PipeTransform {
  transform(value: Date, format: FlightTimeFormat = 'time'): string {
    return formatDate(value, FORMATS[format], 'en-US');
  }
}
