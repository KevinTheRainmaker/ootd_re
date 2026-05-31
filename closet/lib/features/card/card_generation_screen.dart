import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:closet/shared/models/ootd_item.dart';
import 'package:closet/shared/utils/mood_colors.dart';
import 'package:closet/features/home/home_provider.dart';
import 'package:closet/features/home/weather_provider.dart';
import 'package:closet/services/supabase_storage_service.dart';

final supabaseStorageServiceProvider = Provider<SupabaseStorageService>(
  (ref) => SupabaseStorageService(),
);

class CardGenerationScreen extends ConsumerStatefulWidget {
  final String imagePath;
  final String originalImageUrl;
  final List<OotdItem> items;
  final String mood;

  const CardGenerationScreen({
    super.key,
    required this.imagePath,
    required this.originalImageUrl,
    required this.items,
    required this.mood,
  });

  @override
  ConsumerState<CardGenerationScreen> createState() =>
      _CardGenerationScreenState();
}

class _CardGenerationScreenState extends ConsumerState<CardGenerationScreen> {
  bool _isPublic = false;
  bool _isSaving = false;
  String? _savedOotdId;

  static const _categoryLabels = {
    'top': '상의',
    'bottom': '하의',
    'outer': '아우터',
    'shoes': '신발',
    'bag': '가방',
    'accessory': '액세서리',
  };

  Mood get _mood => MoodColor.fromString(widget.mood);

  Future<void> _saveToCalendar() async {
    if (_isSaving) return;
    setState(() => _isSaving = true);
    try {
      final storageService = ref.read(supabaseStorageServiceProvider);
      final ootdService = ref.read(ootdServiceProvider);
      final userId = Supabase.instance.client.auth.currentUser!.id;

      final publicUrl = await storageService.uploadOotdImage(
        userId,
        widget.imagePath,
      );

      final weather = ref.read(weatherProvider).valueOrNull;
      final weatherSnapshot = weather != null
          ? {
              'temp': weather.temp,
              'condition': weather.condition,
              'humidity': weather.humidity,
              'icon_code': weather.iconCode,
            }
          : null;

      final record = await ootdService.createOotd(
        userId: userId,
        date: DateTime.now(),
        originalImageUrl: publicUrl,
        mood: widget.mood,
        isPublic: _isPublic,
        items: widget.items,
        weatherSnapshot: weatherSnapshot,
      );
      setState(() => _savedOotdId = record.id);
      ref.invalidate(ootdsByMonthProvider);
      if (mounted) context.go('/home');
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              '저장 실패: $e',
              style: GoogleFonts.montserrat(fontSize: 13),
            ),
            backgroundColor: Colors.redAccent,
            behavior: SnackBarBehavior.floating,
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  Future<void> _shareLink() async {
    if (_savedOotdId == null) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              '먼저 캘린더에 저장해주세요.',
              style: GoogleFonts.montserrat(fontSize: 13),
            ),
            backgroundColor: Colors.black87,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8)),
          ),
        );
      }
      return;
    }
    await Clipboard.setData(
      ClipboardData(text: 'https://closet.app/ootd/$_savedOotdId'),
    );
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            '공유 링크가 복사되었습니다.',
            style: GoogleFonts.montserrat(fontSize: 13),
          ),
          backgroundColor: Colors.black87,
          behavior: SnackBarBehavior.floating,
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        ),
      );
    }
  }

  void _showProSnackBar() {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          'Pro 구독이 필요합니다.',
          style: GoogleFonts.montserrat(fontSize: 13),
        ),
        backgroundColor: Colors.black87,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.black),
          onPressed: () => context.pop(),
        ),
        title: Text(
          'MY CARD',
          style: GoogleFonts.montserrat(
            fontSize: 14,
            fontWeight: FontWeight.w700,
            letterSpacing: 3,
            color: Colors.black,
          ),
        ),
        centerTitle: true,
      ),
      body: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // 이미지 + 아이템 태그 오버레이
                  _CardPreview(
                    imagePath: widget.imagePath,
                    items: widget.items,
                    mood: _mood,
                    categoryLabels: _categoryLabels,
                  ),
                  const SizedBox(height: 20),
                  // 공개/비공개 토글
                  _VisibilityToggle(
                    isPublic: _isPublic,
                    onChanged: (val) => setState(() => _isPublic = val),
                  ),
                  const Divider(height: 1, thickness: 0.5, color: Color(0xFFEEEEEE)),
                  const SizedBox(height: 16),
                  // Pro 기능 버튼들
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'PRO FEATURES',
                          style: GoogleFonts.montserrat(
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                            letterSpacing: 3,
                            color: Colors.black38,
                          ),
                        ),
                        const SizedBox(height: 10),
                        _ProFeatureButton(
                          icon: Icons.auto_fix_high_outlined,
                          label: '배경 제거',
                          onTap: _showProSnackBar,
                        ),
                        const SizedBox(height: 8),
                        _ProFeatureButton(
                          icon: Icons.style_outlined,
                          label: '스타일 변경',
                          onTap: _showProSnackBar,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 100),
                ],
              ),
            ),
          ),
          // 하단 CTA 버튼
          _BottomActions(
            onSave: _saveToCalendar,
            onShare: _shareLink,
            isSaving: _isSaving,
          ),
        ],
      ),
    );
  }
}

class _CardPreview extends StatelessWidget {
  final String imagePath;
  final List<OotdItem> items;
  final Mood mood;
  final Map<String, String> categoryLabels;

  const _CardPreview({
    required this.imagePath,
    required this.items,
    required this.mood,
    required this.categoryLabels,
  });

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        // 원본 사진
        AspectRatio(
          aspectRatio: 3 / 4,
          child: Image.file(
            File(imagePath),
            fit: BoxFit.cover,
            errorBuilder: (_, __, ___) => Container(
              color: const Color(0xFFF0F0F0),
              child: const Center(
                child: Icon(Icons.image_not_supported_outlined,
                    size: 48, color: Colors.black26),
              ),
            ),
          ),
        ),
        // 무드 컬러 배지 (상단 좌측)
        Positioned(
          top: 12,
          left: 12,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color: mood.color,
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              mood.label,
              style: GoogleFonts.montserrat(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: Colors.white,
                letterSpacing: 1,
              ),
            ),
          ),
        ),
        // 아이템 태그 오버레이 (하단)
        if (items.isNotEmpty)
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: Container(
              padding: const EdgeInsets.fromLTRB(12, 10, 12, 14),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.transparent,
                    Colors.black.withValues(alpha: 0.65),
                  ],
                ),
              ),
              child: Wrap(
                spacing: 6,
                runSpacing: 4,
                children: items.take(4).map((item) {
                  final label = categoryLabels[item.category] ?? item.category;
                  final detail = [
                    if (item.color != null && item.color!.isNotEmpty) item.color!,
                    if (item.brand != null && item.brand!.isNotEmpty) item.brand!,
                  ].join(' · ');
                  return Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.18),
                      borderRadius: BorderRadius.circular(4),
                      border: Border.all(
                        color: Colors.white.withValues(alpha: 0.3),
                        width: 0.5,
                      ),
                    ),
                    child: Text(
                      detail.isNotEmpty ? '$label · $detail' : label,
                      style: GoogleFonts.montserrat(
                        fontSize: 10,
                        color: Colors.white,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
          ),
      ],
    );
  }
}

class _VisibilityToggle extends StatelessWidget {
  final bool isPublic;
  final ValueChanged<bool> onChanged;

  const _VisibilityToggle({required this.isPublic, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Row(
        children: [
          Icon(
            isPublic ? Icons.public : Icons.lock_outline,
            size: 18,
            color: Colors.black54,
          ),
          const SizedBox(width: 8),
          Text(
            isPublic ? '공개' : '비공개',
            style: GoogleFonts.montserrat(
              fontSize: 13,
              color: Colors.black87,
            ),
          ),
          const Spacer(),
          Switch.adaptive(
            value: isPublic,
            onChanged: onChanged,
            activeColor: Colors.black,
          ),
        ],
      ),
    );
  }
}

class _ProFeatureButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _ProFeatureButton({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: const Color(0xFFF5F5F5),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: const Color(0xFFEEEEEE)),
        ),
        child: Row(
          children: [
            Icon(icon, size: 18, color: Colors.black45),
            const SizedBox(width: 10),
            Text(
              label,
              style: GoogleFonts.montserrat(
                fontSize: 13,
                color: Colors.black54,
              ),
            ),
            const Spacer(),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: Colors.black,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.lock, size: 10, color: Colors.white),
                  const SizedBox(width: 3),
                  Text(
                    'Pro 전용',
                    style: GoogleFonts.montserrat(
                      fontSize: 9,
                      fontWeight: FontWeight.w600,
                      color: Colors.white,
                      letterSpacing: 0.5,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _BottomActions extends StatelessWidget {
  final Future<void> Function() onSave;
  final Future<void> Function() onShare;
  final bool isSaving;

  const _BottomActions({
    required this.onSave,
    required this.onShare,
    required this.isSaving,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: Color(0xFFEEEEEE), width: 0.5)),
      ),
      child: Column(
        children: [
          GestureDetector(
            onTap: isSaving ? null : onSave,
            child: Container(
              height: 50,
              decoration: BoxDecoration(
                color: isSaving ? Colors.black38 : Colors.black,
                borderRadius: BorderRadius.circular(25),
              ),
              child: Center(
                child: isSaving
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          color: Colors.white,
                          strokeWidth: 2,
                        ),
                      )
                    : Text(
                        '캘린더에 저장',
                        style: GoogleFonts.montserrat(
                          color: Colors.white,
                          fontWeight: FontWeight.w600,
                          fontSize: 14,
                          letterSpacing: 0.5,
                        ),
                      ),
              ),
            ),
          ),
          const SizedBox(height: 8),
          GestureDetector(
            onTap: onShare,
            child: Container(
              height: 44,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(22),
                border: Border.all(color: const Color(0xFFDDDDDD)),
              ),
              child: Center(
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.link, size: 16, color: Colors.black54),
                    const SizedBox(width: 6),
                    Text(
                      '공유 링크 생성',
                      style: GoogleFonts.montserrat(
                        color: Colors.black54,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
