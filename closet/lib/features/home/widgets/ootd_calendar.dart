import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:table_calendar/table_calendar.dart';
import 'package:closet/shared/models/ootd_record.dart';
import 'package:closet/shared/utils/mood_colors.dart';

class OotdCalendar extends StatefulWidget {
  final Map<DateTime, List<OotdRecord>> ootdsByDate;
  final Function(DateTime) onDaySelected;

  const OotdCalendar({
    super.key,
    required this.ootdsByDate,
    required this.onDaySelected,
  });

  @override
  State<OotdCalendar> createState() => _OotdCalendarState();
}

class _OotdCalendarState extends State<OotdCalendar> {
  DateTime _focusedDay = DateTime.now();
  DateTime? _selectedDay;

  List<OotdRecord> _getRecordsForDay(DateTime day) {
    final key = DateTime(day.year, day.month, day.day);
    return widget.ootdsByDate[key] ?? [];
  }

  @override
  Widget build(BuildContext context) {
    return TableCalendar<OotdRecord>(
      firstDay: DateTime(2020),
      lastDay: DateTime(2030),
      focusedDay: _focusedDay,
      selectedDayPredicate: (day) => isSameDay(_selectedDay, day),
      eventLoader: _getRecordsForDay,
      headerStyle: HeaderStyle(
        formatButtonVisible: false,
        titleCentered: true,
        titleTextStyle: GoogleFonts.montserrat(
          fontSize: 14,
          fontWeight: FontWeight.w600,
          letterSpacing: 1.5,
          color: Colors.black,
        ),
        leftChevronIcon: const Icon(Icons.chevron_left, color: Colors.black, size: 20),
        rightChevronIcon: const Icon(Icons.chevron_right, color: Colors.black, size: 20),
        headerPadding: const EdgeInsets.symmetric(vertical: 8),
        decoration: const BoxDecoration(color: Colors.white),
      ),
      daysOfWeekStyle: DaysOfWeekStyle(
        weekdayStyle: GoogleFonts.montserrat(
          fontSize: 11,
          fontWeight: FontWeight.w500,
          color: Colors.black54,
        ),
        weekendStyle: GoogleFonts.montserrat(
          fontSize: 11,
          fontWeight: FontWeight.w500,
          color: Colors.black38,
        ),
      ),
      calendarStyle: CalendarStyle(
        outsideDaysVisible: false,
        defaultTextStyle: GoogleFonts.montserrat(
          fontSize: 13,
          color: Colors.black87,
        ),
        weekendTextStyle: GoogleFonts.montserrat(
          fontSize: 13,
          color: Colors.black54,
        ),
        selectedTextStyle: GoogleFonts.montserrat(
          fontSize: 13,
          fontWeight: FontWeight.w700,
          color: Colors.white,
        ),
        todayTextStyle: GoogleFonts.montserrat(
          fontSize: 13,
          fontWeight: FontWeight.w700,
          color: Colors.black,
        ),
        selectedDecoration: const BoxDecoration(
          color: Colors.black,
          shape: BoxShape.circle,
        ),
        todayDecoration: BoxDecoration(
          color: Colors.transparent,
          shape: BoxShape.circle,
          border: Border.all(color: Colors.black, width: 1),
        ),
        markerDecoration: const BoxDecoration(shape: BoxShape.circle),
        markersMaxCount: 1,
        markerSize: 6,
        markerMargin: const EdgeInsets.only(top: 2),
        cellMargin: const EdgeInsets.all(4),
      ),
      calendarBuilders: CalendarBuilders<OotdRecord>(
        markerBuilder: (context, day, records) {
          if (records.isEmpty) return const SizedBox.shrink();
          final mood = MoodColor.fromString(records.first.mood);
          return Positioned(
            bottom: 4,
            child: Container(
              width: 6,
              height: 6,
              decoration: BoxDecoration(
                color: mood.color,
                shape: BoxShape.circle,
              ),
            ),
          );
        },
      ),
      onDaySelected: (selectedDay, focusedDay) {
        setState(() {
          _selectedDay = selectedDay;
          _focusedDay = focusedDay;
        });
        widget.onDaySelected(selectedDay);
      },
      onPageChanged: (focusedDay) {
        setState(() {
          _focusedDay = focusedDay;
        });
      },
    );
  }
}
