import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:closet/features/home/widgets/ootd_calendar.dart';
import 'package:closet/features/home/widgets/weather_widget.dart';
import 'package:closet/features/home/home_provider.dart';
import 'package:closet/shared/models/ootd_record.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  DateTime? _selectedDay;

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final ootds = ref.watch(
      ootdsByMonthProvider((year: now.year, month: now.month)),
    );
    final ootdsByDate = ootds.valueOrNull ?? {};

    return Scaffold(
      backgroundColor: const Color(0xFFFDF8F8),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: Text(
          'CLOSET',
          style: GoogleFonts.montserrat(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            letterSpacing: 4,
            color: Colors.black,
          ),
        ),
        centerTitle: true,
      ),
      body: Column(
        children: [
          // 날씨 위젯 영역 (상단 30%)
          const Flexible(
            flex: 3,
            child: WeatherWidget(),
          ),
          const Divider(height: 1, thickness: 0.5, color: Color(0xFFE0E0E0)),
          // OOTD 캘린더 (하단 60%)
          Flexible(
            flex: 6,
            child: Container(
              color: Colors.white,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
                    child: Text(
                      'MY OOTD',
                      style: GoogleFonts.montserrat(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 3,
                        color: Colors.black54,
                      ),
                    ),
                  ),
                  Expanded(
                    child: OotdCalendar(
                      ootdsByDate: ootdsByDate,
                      onDaySelected: (day) => setState(() => _selectedDay = day),
                    ),
                  ),
                  if (_selectedDay != null)
                    _SelectedDayInfo(
                      selectedDay: _selectedDay!,
                      records: ootdsByDate[
                            DateTime(_selectedDay!.year, _selectedDay!.month, _selectedDay!.day)
                          ] ??
                          [],
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SelectedDayInfo extends StatelessWidget {
  final DateTime selectedDay;
  final List<OotdRecord> records;

  const _SelectedDayInfo({
    required this.selectedDay,
    required this.records,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: const BoxDecoration(
        border: Border(top: BorderSide(color: Color(0xFFE0E0E0), width: 0.5)),
      ),
      child: records.isEmpty
          ? Text(
              '이 날의 OOTD가 없습니다.',
              style: GoogleFonts.montserrat(
                fontSize: 12,
                color: Colors.black38,
              ),
            )
          : Text(
              'OOTD ${records.length}개',
              style: GoogleFonts.montserrat(
                fontSize: 12,
                fontWeight: FontWeight.w500,
                color: Colors.black87,
              ),
            ),
    );
  }
}
