<template>
  <div>
    <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 class="mb-1 text-headline-lg text-primary">MỤC TIÊU CÁ NHÂN</h2>
        <div class="flex flex-wrap items-center gap-2 text-body-md text-on-surface-variant">
          <span>{{ meta.weekLabel }}</span>
          <DatePicker
            v-model="weekRange"
            selectionMode="range"
            :manualInput="false"
            showIcon
            iconDisplay="input"
            showWeek
            showButtonBar
            hideOnRangeSelection
            dateFormat="dd/mm/yy"
            placeholder="Chọn tuần"
            class="week-datepicker"
            inputClass="week-datepicker-input"
            @update:modelValue="onWeekRangeUpdate"
          />
        </div>
        <p class="mt-1 text-sm text-on-surface-variant">
          Leader điều phối mục tiêu tuần tới từng nhân sự
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-label-md text-on-primary transition-colors hover:brightness-110"
          @click="focusDraft"
        >
          <Icon name="add" icon-class="text-[18px]" />
          Thêm nhân sự
        </button>
        <span
          class="inline-flex flex-wrap items-center gap-2 rounded-full bg-white px-3 py-1.5 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_1px_3px_rgb(0_0_0/0.06)]"
        >
          <span class="inline-flex items-center gap-1.5 px-1 text-xs font-semibold text-on-surface-variant">
            <span class="size-2 rounded-full bg-[#34a853]" />
            On Track
          </span>
          <span class="inline-flex items-center gap-1.5 px-1 text-xs font-semibold text-on-surface-variant">
            <span class="size-2 rounded-full bg-[#f9ab00]" />
            Pending
          </span>
          <span class="inline-flex items-center gap-1.5 px-1 text-xs font-semibold text-on-surface-variant">
            <span class="size-2 rounded-full bg-[#1e8e3e]" />
            Done
          </span>
        </span>
      </div>
    </div>

    <div
      class="mb-4 flex flex-col gap-3 rounded-md bg-white px-5 py-4 ambient-shadow sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        <label
          class="flex min-w-[14rem] max-w-md flex-1 items-center gap-2 rounded-full bg-surface-container-low px-3.5 py-2 transition-all focus-within:ring-2 focus-within:ring-primary/20"
        >
          <Icon name="search" icon-class="shrink-0 text-[18px] text-outline" />
          <input
            v-model="searchQuery"
            type="search"
            class="w-full min-w-0 border-none bg-transparent text-sm text-on-surface placeholder:text-outline-variant focus:outline-none focus:ring-0"
            placeholder="Tìm nhân sự, mục tiêu, tiến độ..."
            aria-label="Tìm kiếm mục tiêu cá nhân"
          />
          <button
            v-if="searchQuery.trim()"
            type="button"
            class="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary"
            title="Xóa tìm kiếm"
            aria-label="Xóa tìm kiếm"
            @click="searchQuery = ''"
          >
            <Icon name="close" icon-class="text-[16px]" />
          </button>
        </label>
        <p v-if="searchQuery.trim()" class="text-xs text-on-surface-variant">
          {{ visibleRows.length - (showDraftInList ? 1 : 0) }} kết quả
        </p>
      </div>
      <p
        class="deadline-badge inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium not-italic"
        :class="`deadline-${deadlineUrgency}`"
        :title="deadlineHint"
      >
        <Icon
          :name="deadlineUrgency === 'ok' ? 'schedule' : 'warning'"
          icon-class="text-[18px]"
        />
        <span>{{ meta.deadlineNote }}</span>
      </p>
    </div>

    <div class="overflow-x-auto rounded-md bg-white ambient-shadow">
      <div
        class="board-col-headers hidden min-w-[960px] grid-cols-[48px_minmax(140px,0.9fr)_minmax(220px,1.6fr)_minmax(120px,0.7fr)_minmax(220px,1.6fr)_minmax(180px,1.2fr)_72px] items-center gap-3 border-b border-dashed border-outline-variant/50 bg-surface-container-low px-4 py-3 text-[11px] font-bold uppercase tracking-[0.04em] text-on-surface lg:grid"
      >
        <span class="text-center">STT</span>
        <span class="text-center">Nhân sự</span>
        <span class="text-center">
          Mục tiêu
          <span class="dl-note block normal-case tracking-normal">(DL: 12h thứ 2 hàng tuần)</span>
        </span>
        <span class="text-center">
          Trạng thái
          <span class="dl-note block normal-case tracking-normal">(DL: sau họp tuần)</span>
        </span>
        <span class="text-center">
          Tiến độ / Thành phẩm
          <span class="dl-note block normal-case tracking-normal">(DL: 12h thứ 6 hàng tuần)</span>
        </span>
        <span class="text-center">
          Focus tuần sau
          <span class="dl-note block normal-case tracking-normal">(DL: 12h thứ 6 hàng tuần)</span>
        </span>
        <span />
      </div>

      <p
        v-if="searchQuery.trim() && rows.length > 0 && filteredRows.length === 0"
        class="min-w-[960px] px-5 py-10 text-center text-sm text-on-surface-variant"
      >
        Không tìm thấy mục tiêu khớp “{{ searchQuery.trim() }}”.
      </p>

      <p
        v-else-if="rows.length === 0 && !searchQuery.trim()"
        class="min-w-[960px] border-b border-dashed border-outline-variant/40 px-5 py-8 text-center text-sm text-on-surface-variant"
      >
        Chưa có mục tiêu cá nhân cho tuần này. Bấm “Thêm nhân sự” để bắt đầu điều phối.
      </p>

      <article
        v-for="(row, index) in visibleRows"
        :key="row.isDraft ? 'draft' : row.id"
        class="goal-row grid min-w-[960px] grid-cols-1 items-start gap-3 border-b border-dashed border-outline-variant/40 px-4 py-4 transition-colors hover:bg-surface-container-low/40 lg:grid-cols-[48px_minmax(140px,0.9fr)_minmax(220px,1.6fr)_minmax(120px,0.7fr)_minmax(220px,1.6fr)_minmax(180px,1.2fr)_72px] lg:gap-3"
        :class="row.isDraft || isRowEditing(row) ? 'bg-primary-fixed/20 new-goal-row' : ''"
        :data-draft="row.isDraft ? '1' : undefined"
        :data-goal-id="row.isDraft ? undefined : row.id"
        @keydown.enter.exact="onEditRowEnter($event, row)"
        @keydown.escape.exact="onEditEscape(row)"
        @focusout="row.isDraft ? onDraftRowFocusOut(row) : undefined"
      >
        <div class="goal-cell flex items-center gap-2 lg:justify-center lg:pt-2">
          <span class="text-[10px] font-semibold uppercase tracking-wide text-primary/50 lg:hidden">
            STT
          </span>
          <span class="text-sm font-semibold text-on-surface-variant">
            {{ row.isDraft ? "—" : index + 1 }}
          </span>
        </div>

        <div
          data-field="person"
          class="goal-cell group relative pr-7"
          :class="!row.isDraft && !isFieldEditing(row, 'person') ? 'cursor-pointer' : ''"
          @dblclick="startFieldEdit(row, 'person')"
        >
          <p class="mb-1 text-[10px] font-semibold uppercase tracking-wide text-primary/50 lg:hidden">
            Nhân sự
          </p>
          <Select
            v-if="isFieldEditing(row, 'person')"
            :modelValue="row.personName || null"
            :options="personOptionsFor(row)"
            optionLabel="name"
            optionValue="name"
            filter
            placeholder="Chọn nhân sự..."
            emptyFilterMessage="Không tìm thấy"
            emptyMessage="Không có nhân sự"
            class="w-full text-sm"
            @update:modelValue="(name) => setPerson(row, name)"
            @hide="finishFieldEdit(row, 'person')"
          />
          <template v-else>
            <div class="flex flex-col items-center gap-1.5 lg:pt-1">
              <PersonTag
                v-if="row.personName"
                :name="row.personName"
                :avatar="row.personAvatar"
              />
              <span v-else class="text-sm text-on-surface-variant">ㅤ</span>
              <p
                v-if="row.createdBy"
                class="text-[10px] text-outline"
                :title="`Người tạo: ${row.createdBy}`"
              >
                Tạo bởi {{ row.createdBy }}
              </p>
              <RouterLink
                v-if="row.personName && !row.isDraft"
                :to="{
                  name: 'day-plan-person',
                  params: { personName: row.personName },
                  query: { week: meta.weekStart }
                }"
                class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold text-primary/80 transition-colors hover:bg-primary/10 hover:text-primary"
                title="Lập kế hoạch theo ngày"
                @click.stop
              >
                <Icon name="calendar_month" icon-class="text-[14px]" />
                Plan ngày
              </RouterLink>
            </div>
            <button
              v-if="!row.isDraft"
              type="button"
              class="field-edit-btn"
              title="Sửa"
              aria-label="Sửa nhân sự"
              @click.stop="startFieldEdit(row, 'person')"
            >
              <Icon name="edit" icon-class="text-[14px]" />
            </button>
          </template>
        </div>

        <div
          data-field="goals"
          class="goal-cell group relative  pr-7"
          :class="!row.isDraft && !isFieldEditing(row, 'goals') ? 'cursor-text' : ''"
          @dblclick="onGoalsActivate(row)"
        >
          <p class="mb-1 text-[10px] font-semibold uppercase tracking-wide text-primary/50 lg:hidden">
            Mục tiêu
            <span class="dl-note normal-case">(DL: 12h thứ 2)</span>
          </p>
          <div v-if="isFieldEditing(row, 'goals')" class="space-y-2">
            <Textarea
              v-model="row.goals"
              rows="3"
              class="goal-textarea w-full text-[10px] leading-relaxed"
              placeholder="1. Mục tiêu chính&#10;+ Chi tiết / hạng mục con (cùng 1 mục tiêu)"
              @input="onGoalsInput(row)"
              @blur="onTextFieldBlur(row, 'goals')"
            />
            <button
              v-if="shouldShowExpandGuide(row, 'goals')"
              type="button"
              class="expand-hint expand-hint--guide"
              @mousedown.prevent
              @click="openExpandEditor(row, 'goals')"
            >
              <Icon name="open_in_full" icon-class="text-[18px]" />
              <span class="expand-hint-copy">
                <span class="expand-hint-title">Mở editor lớn</span>
                <span class="expand-hint-sub">Gõ nhiều dòng / chi tiết “+ …” — chỉnh rõ hơn trong editor</span>
              </span>
            </button>
          </div>
          <template v-else>
            <ol
              v-if="parseGoalItems(row.goals).length"
              class="list-none space-y-2 text-sm leading-relaxed text-on-surface"
            >
              <li
                v-for="(item, gi) in parseGoalItems(row.goals)"
                :key="`${row.id}-g-${gi}`"
                class="flex gap-2"
              >
                <span class="shrink-0 font-semibold text-primary/70">{{ gi + 1 }}.</span>
                <span class="min-w-0 break-words whitespace-pre-line [overflow-wrap:anywhere]">{{
                  item.text
                }}</span>
              </li>
            </ol>
            <p v-else class="whitespace-pre-line text-sm leading-relaxed text-on-surface">ㅤ</p>
            <div class="field-edit-actions">
              <button
                type="button"
                class="field-edit-btn static-btn"
                title="Mở editor"
                aria-label="Mở editor mục tiêu"
                @click.stop="openExpandEditor(row, 'goals')"
              >
                <Icon name="open_in_full" icon-class="text-[14px]" />
              </button>
              <button
                v-if="!row.isDraft"
                type="button"
                class="field-edit-btn static-btn"
                title="Sửa"
                aria-label="Sửa mục tiêu"
                @click.stop="onGoalsActivate(row)"
              >
                <Icon name="edit" icon-class="text-[14px]" />
              </button>
            </div>
          </template>
        </div>

        <div data-field="status" class="goal-cell pt-0.5">
          <p class="mb-1 text-[10px] font-semibold uppercase tracking-wide text-primary/50 lg:hidden">
            Trạng thái
          </p>
          <div class="flex justify-center lg:justify-stretch">
            <StatusSelect
              :modelValue="row.status"
              :disabled="savingIds.has(row.id)"
              @update:modelValue="(value) => onStatusChange(row, value)"
            />
          </div>
        </div>

        <div
          data-field="progress"
          class="goal-cell group relative min-w-0  pr-7"
          :class="!row.isDraft && !isFieldEditing(row, 'progress') ? 'cursor-text' : ''"
          @dblclick="startFieldEdit(row, 'progress')"
        >
          <p class="mb-1 text-[10px] font-semibold uppercase tracking-wide text-primary/50 lg:hidden">
            Tiến độ / Thành phẩm
            <span class="dl-note normal-case">(DL: 12h thứ 6)</span>
          </p>
          <div
            v-if="isFieldEditing(row, 'progress')"
            class="space-y-2"
            @focusout="onProgressFocusOut(row, $event)"
          >
            <p
              v-if="!parseGoalItems(row.goals).length"
              class="rounded-md bg-surface-container-low px-3 py-2 text-xs text-on-surface-variant"
            >
              Nhập mục tiêu trước để điền thành phẩm theo từng mục.
            </p>
            <div v-else class="space-y-2">
              <div
                v-for="(goal, gi) in parseGoalItems(row.goals)"
                :key="`${row.id}-pe-${gi}`"
                class="progress-pair rounded-md border border-outline-variant/40 bg-surface-container-low/50 p-2.5"
              >
                <p
                  class="mb-2 truncate text-xs font-medium text-on-surface"
                  :title="goal.text"
                >
                  <span class="text-primary/80">{{ gi + 1 }}.</span>
                  {{ goalPreview(goal.text) }}
                </p>
                <div class="flex flex-col gap-1.5">
                  <Select
                    :modelValue="progressItemAt(row, gi).status || null"
                    :options="[...PROGRESS_STATUS_OPTIONS]"
                    placeholder="Trạng thái"
                    showClear
                    class="w-full text-xs"
                    @update:modelValue="(v) => patchProgressItem(row, gi, { status: v ?? '' })"
                  />
                  <input
                    type="text"
                    class="field-input"
                    :value="progressItemAt(row, gi).result"
                    placeholder="Kết quả / ghi chú..."
                    @input="
                      patchProgressItem(row, gi, {
                        result: ($event.target as HTMLInputElement).value
                      })
                    "
                  />
                  <input
                    type="url"
                    class="field-input"
                    :value="progressItemAt(row, gi).link"
                    placeholder="Link thành phẩm..."
                    @input="
                      patchProgressItem(row, gi, {
                        link: ($event.target as HTMLInputElement).value
                      })
                    "
                  />
                </div>
              </div>
            </div>
            <button
              v-if="parseGoalItems(row.goals).length"
              type="button"
              class="expand-hint expand-hint--guide"
              @mousedown.prevent
              @click="openExpandEditor(row, 'progress')"
            >
              <Icon name="open_in_full" icon-class="text-[18px]" />
              <span class="expand-hint-copy">
                <span class="expand-hint-title">Mở editor lớn</span>
                <span class="expand-hint-sub">Điền thành phẩm từng mục cho dễ theo dõi</span>
              </span>
            </button>
          </div>
          <template v-else>
            <div class="min-w-0 space-y-2 text-sm leading-relaxed text-on-surface-variant">
              <template v-if="!parseGoalItems(row.goals).length && !row.progress?.trim()">
                ㅤ
              </template>
              <template v-else-if="parseGoalItems(row.goals).length">
                <div
                  v-for="(goal, gi) in parseGoalItems(row.goals)"
                  :key="`${row.id}-pv-${gi}`"
                  class="progress-pair-view"
                >
                  <p class="truncate text-xs font-medium text-on-surface" :title="goal.text">
                    <span class="text-primary/80">{{ gi + 1 }}.</span>
                    {{ goalPreview(goal.text) }}
                  </p>
                  <p class="mt-0.5 break-words text-xs [overflow-wrap:anywhere]">
                    <span
                      v-if="progressItemAt(row, gi).status"
                      class="mr-1 font-semibold text-on-surface"
                    >[{{ progressItemAt(row, gi).status }}]</span>
                    <template v-if="progressItemAt(row, gi).result">
                      <template
                        v-for="(part, i) in progressNoteParts(progressItemAt(row, gi).result)"
                        :key="`${row.id}-pr-${gi}-${i}`"
                      >
                        <a
                          v-if="part.href"
                          :href="part.href"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="progress-link-inline"
                          :title="part.text"
                          @click.stop
                          @dblclick.prevent.stop
                        >{{ part.label }}</a>
                        <template v-else>{{ part.text }}</template>
                      </template>
                    </template>
                    <span
                      v-else-if="!progressItemAt(row, gi).link"
                      class="text-outline"
                    >Chưa có kết quả</span>
                  </p>
                  <a
                    v-if="progressItemAt(row, gi).link"
                    :href="normalizeHref(progressItemAt(row, gi).link)"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="progress-link-inline mt-0.5 inline-flex max-w-full items-center gap-1 truncate text-xs"
                    @click.stop
                    @dblclick.prevent.stop
                  >
                    <Icon name="open_in_new" icon-class="shrink-0 text-[12px]" />
                    {{ linkLabel(progressItemAt(row, gi).link) }}
                  </a>
                </div>
              </template>
              <template v-else-if="parseProgressItems(row.progress, 1).some((p) => p.status || p.result || p.link)">
                <div
                  v-for="(item, gi) in parseProgressItems(row.progress, 1)"
                  :key="`${row.id}-ploose-${gi}`"
                  class="progress-pair-view"
                >
                  <p class="break-words text-xs [overflow-wrap:anywhere]">
                    <span
                      v-if="item.status"
                      class="mr-1 font-semibold text-on-surface"
                    >[{{ item.status }}]</span>
                    <template v-if="item.result">
                      <template
                        v-for="(part, i) in progressNoteParts(item.result)"
                        :key="`${row.id}-plr-${gi}-${i}`"
                      >
                        <a
                          v-if="part.href"
                          :href="part.href"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="progress-link-inline"
                          :title="part.text"
                          @click.stop
                          @dblclick.prevent.stop
                        >{{ part.label }}</a>
                        <template v-else>{{ part.text }}</template>
                      </template>
                    </template>
                  </p>
                  <a
                    v-if="item.link"
                    :href="normalizeHref(item.link)"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="progress-link-inline mt-0.5 inline-flex items-center gap-1 text-xs"
                    @click.stop
                    @dblclick.prevent.stop
                  >
                    <Icon name="open_in_new" icon-class="text-[12px]" />
                    {{ linkLabel(item.link) }}
                  </a>
                </div>
              </template>
              <p v-else>ㅤ</p>
            </div>
            <div class="field-edit-actions">
              <button
                type="button"
                class="field-edit-btn static-btn"
                title="Mở editor"
                aria-label="Mở editor tiến độ"
                @click.stop="openExpandEditor(row, 'progress')"
              >
                <Icon name="open_in_full" icon-class="text-[14px]" />
              </button>
              <button
                v-if="!row.isDraft"
                type="button"
                class="field-edit-btn static-btn"
                title="Sửa"
                aria-label="Sửa tiến độ"
                @click.stop="startFieldEdit(row, 'progress')"
              >
                <Icon name="edit" icon-class="text-[14px]" />
              </button>
            </div>
          </template>
        </div>

        <div
          data-field="nextFocus"
          class="goal-cell group relative pr-7"
          :class="!row.isDraft && !isFieldEditing(row, 'nextFocus') ? 'cursor-text' : ''"
          @dblclick="startFieldEdit(row, 'nextFocus')"
        >
          <p class="mb-1 text-[10px] font-semibold uppercase tracking-wide text-primary/50 lg:hidden">
            Focus tuần sau
            <span class="dl-note normal-case">(DL: 12h thứ 6)</span>
          </p>
          <div v-if="isFieldEditing(row, 'nextFocus')" class="space-y-2">
            <Textarea
              v-model="row.nextFocus"
              rows="3"
              class="goal-textarea w-full text-sm leading-relaxed"
              placeholder="Focus tuần sau..."
              @input="onPlainTextInput(row, 'nextFocus')"
              @blur="onTextFieldBlur(row, 'nextFocus')"
            />
            <button
              v-if="shouldShowExpandGuide(row, 'nextFocus')"
              type="button"
              class="expand-hint expand-hint--guide"
              @mousedown.prevent
              @click="openExpandEditor(row, 'nextFocus')"
            >
              <Icon name="open_in_full" icon-class="text-[18px]" />
              <span class="expand-hint-copy">
                <span class="expand-hint-title">Mở editor lớn</span>
                <span class="expand-hint-sub">Cần viết dài hơn? Mở editor để nhìn rõ toàn bộ nội dung</span>
              </span>
            </button>
          </div>
          <template v-else>
            <p class="break-words whitespace-pre-line text-sm leading-relaxed text-on-surface-variant [overflow-wrap:anywhere]">
              {{ row.nextFocus || "ㅤ" }}
            </p>
            <div class="field-edit-actions">
              <button
                type="button"
                class="field-edit-btn static-btn"
                title="Mở editor"
                aria-label="Mở editor focus tuần sau"
                @click.stop="openExpandEditor(row, 'nextFocus')"
              >
                <Icon name="open_in_full" icon-class="text-[14px]" />
              </button>
              <button
                v-if="!row.isDraft"
                type="button"
                class="field-edit-btn static-btn"
                title="Sửa"
                aria-label="Sửa focus tuần sau"
                @click.stop="startFieldEdit(row, 'nextFocus')"
              >
                <Icon name="edit" icon-class="text-[14px]" />
              </button>
            </div>
          </template>
        </div>

        <div class="goal-cell flex items-start justify-end gap-1 pt-0.5">
          <button
            v-if="row.isDraft"
            type="button"
            class="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-on-primary transition-colors hover:brightness-110 disabled:opacity-50"
            :disabled="savingIds.has(row.id)"
            title="Lưu"
            aria-label="Lưu"
            @click="saveRow(row)"
          >
            <Icon name="check" icon-class="text-[18px]" />
          </button>
          <button
            type="button"
            class="inline-flex h-9 w-9 items-center justify-center rounded-full bg-surface-container-low text-error transition-colors hover:bg-error-container/50 disabled:opacity-50"
            :disabled="savingIds.has(row.id) || deletingIds.has(row.id)"
            :title="row.isDraft ? 'Xóa nội dung' : 'Xóa'"
            :aria-label="row.isDraft ? 'Xóa nội dung' : 'Xóa'"
            @click="deleteRow(row)"
          >
            <Icon name="delete" icon-class="text-[18px]" />
          </button>
        </div>
      </article>
    </div>

    <Dialog
      v-model:visible="expandVisible"
      modal
      dismissableMask
      :header="expandHeader"
      :style="{ width: 'min(720px, 94vw)' }"
      :breakpoints="{ '640px': '96vw' }"
      class="expand-editor-dialog"
      @hide="onExpandHide"
    >
      <div v-if="expandState" class="space-y-4">
        <p class="text-sm text-on-surface-variant">{{ expandHint }}</p>

        <div v-if="expandState.field === 'goals'" class="space-y-3">
          <div
            v-for="(item, i) in expandState.goalItems"
            :key="`ex-g-${i}`"
            class="flex items-start gap-2"
          >
            <span class="mt-2.5 w-6 shrink-0 text-sm font-semibold text-primary/80">{{ i + 1 }}.</span>
            <Textarea
              v-model="item.text"
              rows="4"
              class="goal-textarea min-w-0 flex-1 text-sm"
              placeholder="Nội dung mục tiêu...&#10;+ Chi tiết / hạng mục con"
              @input="onExpandGoalInput"
            />
            <button
              v-if="expandState.goalItems.length > 1"
              type="button"
              class="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-error transition-colors hover:bg-error-container/40"
              title="Xóa mục"
              aria-label="Xóa mục tiêu"
              @click="removeExpandGoal(i)"
            >
              <Icon name="close" icon-class="text-[18px]" />
            </button>
          </div>
          <p class="text-xs text-on-surface-variant">
            Luôn có sẵn ô trống cuối danh sách — gõ tiếp là thêm mục tiêu mới.
          </p>
        </div>

        <div v-else-if="expandState.field === 'progress'" class="space-y-3">
          <p
            v-if="!filledExpandGoals.length"
            class="rounded-md bg-surface-container-low px-3 py-3 text-sm text-on-surface-variant"
          >
            Chưa có mục tiêu. Hãy nhập mục tiêu trước, rồi điền thành phẩm cho từng mục.
          </p>
          <div
            v-for="(goal, i) in filledExpandGoals"
            :key="`ex-p-${i}`"
            class="progress-pair rounded-md border border-outline-variant/40 bg-surface-container-low/40 p-3"
          >
            <p class="mb-2 text-sm font-medium text-on-surface">
              <span class="text-primary/80">{{ i + 1 }}.</span>
              {{ goalPreview(goal.text) || "Mục tiêu trống" }}
            </p>
            <div class="grid gap-2 sm:grid-cols-[140px_1fr]">
              <Select
                :modelValue="expandState.progressItems[i]?.status || null"
                :options="[...PROGRESS_STATUS_OPTIONS]"
                placeholder="Trạng thái"
                showClear
                class="w-full text-sm"
                @update:modelValue="(v) => patchExpandProgressStatus(i, v)"
              />
              <input
                v-model="expandState.progressItems[i].result"
                type="text"
                class="field-input"
                placeholder="Kết quả / ghi chú cho mục này..."
              />
            </div>
            <input
              v-model="expandState.progressItems[i].link"
              type="url"
              class="field-input mt-2"
              placeholder="Link thành phẩm (Google Docs, Drive, Figma...)"
            />
          </div>
        </div>

        <Textarea
          v-else
          v-model="expandState.plainText"
          rows="12"
          class="w-full text-sm leading-relaxed"
          placeholder="Focus tuần sau..."
          autofocus
        />
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <button
            type="button"
            class="rounded-full px-4 py-2 text-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container"
            @click="closeExpandEditor()"
          >
            Hủy
          </button>
          <button
            type="button"
            class="rounded-full bg-primary px-4 py-2 text-sm font-medium text-on-primary transition-colors hover:brightness-110"
            @click="applyExpandEditor"
          >
            Áp dụng
          </button>
        </div>
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from "vue";
import { RouterLink } from "vue-router";
import DatePicker from "primevue/datepicker";
import Dialog from "primevue/dialog";
import Select from "primevue/select";
import Textarea from "primevue/textarea";
import { useConfirm } from "primevue/useconfirm";
import { useToast } from "primevue/usetoast";
import Icon from "@/components/Icon.vue";
import PersonTag from "@/components/PersonTag.vue";
import StatusSelect from "@/components/StatusSelect.vue";
import { authHeaders } from "@/lib/auth";
import {
  parseGoalItems,
  parseProgressItems,
  PROGRESS_STATUS_OPTIONS,
  serializeGoalItems,
  serializeProgressItems,
  type GoalItem,
  type ProgressItem
} from "@/lib/goalItems";
import {
  ensureProgressDeadlinePermission,
  maybeNotifyProgressDeadline
} from "@/lib/progressDeadlineNotify";
import {
  formatDeadlineNote,
  getDeadlineAt,
  getDeadlineUrgency,
  getWeekInfo,
  parseIsoDate,
  type DeadlineUrgency
} from "@/lib/week";

interface PersonnelOption {
  name: string;
  avatar?: string | null;
}

type EditField = "person" | "goals" | "status" | "progress" | "nextFocus";
type ExpandField = "goals" | "progress" | "nextFocus";

interface GoalRow {
  id: number;
  personName: string;
  personAvatar: string | null;
  goals: string;
  status: string;
  progress: string;
  nextFocus: string;
  createdBy?: string;
  isDraft?: boolean;
}

interface ExpandEditorState {
  rowId: number;
  isDraft: boolean;
  field: ExpandField;
  goalItems: GoalItem[];
  progressItems: ProgressItem[];
  plainText: string;
}

interface BoardMeta {
  weekStart: string;
  weekLabel: string;
  deadlineNote: string;
}

const toast = useToast();
const confirm = useConfirm();
const initialWeek = getWeekInfo();

const meta = ref<BoardMeta>({
  weekStart: initialWeek.weekStart,
  weekLabel: initialWeek.weekLabel,
  deadlineNote: formatDeadlineNote(initialWeek.start)
});

const nowTick = ref(Date.now());
let deadlineTimer: ReturnType<typeof setInterval> | null = null;

const deadlineAt = computed(() => {
  const monday = parseIsoDate(meta.value.weekStart) ?? initialWeek.start;
  return getDeadlineAt(monday);
});

const deadlineUrgency = computed<DeadlineUrgency>(() =>
  getDeadlineUrgency(deadlineAt.value, new Date(nowTick.value))
);

const deadlineHint = computed(() => {
  const ms = deadlineAt.value.getTime() - nowTick.value;
  if (ms < 0) {
    const hoursLate = Math.ceil(-ms / (1000 * 60 * 60));
    return hoursLate <= 24
      ? `Đã quá hạn nhập thành phẩm ${hoursLate} giờ`
      : `Đã quá hạn nhập thành phẩm ${Math.ceil(hoursLate / 24)} ngày`;
  }
  const hours = ms / (1000 * 60 * 60);
  if (hours <= 1) return `Còn khoảng ${Math.max(1, Math.ceil(hours * 60))} phút nhập thành phẩm — gấp!`;
  if (hours <= 3) return `Còn khoảng ${Math.ceil(hours)} giờ nhập thành phẩm — gấp!`;
  if (hours <= 24) return `Còn khoảng ${Math.ceil(hours)} giờ đến hạn nhập thành phẩm`;
  if (hours <= 48) return `Sắp đến hạn nhập thành phẩm — còn khoảng ${Math.ceil(hours)} giờ`;
  return `Hạn nhập thành phẩm: 12h thứ Sáu`;
});

function rowNeedsProgress(row: GoalRow): boolean {
  const goals = parseGoalItems(row.goals);
  if (!goals.length) return false;
  const items = parseProgressItems(row.progress, goals.length);
  return items.some((p) => !p.status.trim() && !p.result.trim() && !p.link.trim());
}

function hasPendingProgress(): boolean {
  return rows.value.some((row) => !row.isDraft && rowNeedsProgress(row));
}

function runProgressDeadlineNotify() {
  const monday = parseIsoDate(meta.value.weekStart);
  if (!monday) return;
  // Only notify for the current work week
  const currentWeek = getWeekInfo();
  if (meta.value.weekStart !== currentWeek.weekStart) return;

  maybeNotifyProgressDeadline({
    weekStart: meta.value.weekStart,
    monday,
    now: new Date(nowTick.value),
    shouldNotify: hasPendingProgress(),
    onToast: ({ summary, detail, severity }) => {
      toast.add({ severity, summary, detail, life: 9000 });
    }
  });
}

const rows = ref<GoalRow[]>([]);
const personnel = ref<PersonnelOption[]>([]);
const selectedWeekStart = ref(initialWeek.weekStart);
const weekRange = ref<Date[] | null>([initialWeek.start, initialWeek.end]);
const savingIds = ref(new Set<number>());
const deletingIds = ref(new Set<number>());
const editingCell = ref<{ rowId: number; field: EditField } | null>(null);
const baselines = new Map<number, string>();
const autoSaveTimers = new Map<number, ReturnType<typeof setTimeout>>();
const AUTO_SAVE_DELAY_MS = 400;
const searchQuery = ref("");

const expandVisible = ref(false);
const expandState = ref<ExpandEditorState | null>(null);
let suppressBlurField: ExpandField | null = null;

const expandHeader = computed(() => {
  switch (expandState.value?.field) {
    case "goals":
      return "Chỉnh sửa mục tiêu";
    case "progress":
      return "Thành phẩm theo từng mục tiêu";
    case "nextFocus":
      return "Chỉnh sửa focus tuần sau";
    default:
      return "Text editor";
  }
});

const expandHint = computed(() => {
  switch (expandState.value?.field) {
    case "goals":
      return "Mỗi số 1. 2. là một mục tiêu. Dòng “+ …” phía dưới vẫn thuộc cùng mục đó. Thành phẩm gắn theo từng mục.";
    case "progress":
      return "Điền trạng thái, kết quả và link thành phẩm cho từng mục tiêu.";
    case "nextFocus":
      return "Viết rõ focus cho tuần tới — editor lớn giúp dễ nhìn hơn.";
    default:
      return "";
  }
});

const filledExpandGoals = computed(() =>
  (expandState.value?.goalItems ?? []).filter((g) => g.text.trim())
);

function resolveExpandRow(state: ExpandEditorState): GoalRow | undefined {
  if (state.isDraft) return draft.value;
  return findRowById(state.rowId);
}

function progressItemAt(row: GoalRow, index: number): ProgressItem {
  const goals = parseGoalItems(row.goals);
  const items = parseProgressItems(row.progress, goals.length);
  return items[index] ?? { status: "", result: "", link: "" };
}

/** First line only — keeps progress column compact for multi-line goals. */
function goalPreview(text: string): string {
  const first = (text ?? "").split(/\r?\n/).find((line) => line.trim()) ?? "";
  return first.trim();
}

/** Multi-line goals open in the large editor; short ones stay inline. */
async function onGoalsActivate(row: GoalRow) {
  const text = row.goals ?? "";
  const multiLine = text.includes("\n") || text.length > 80;
  if (!row.isDraft && multiLine) {
    await openExpandEditor(row, "goals");
    return;
  }
  await startFieldEdit(row, "goals");
}

function patchProgressItem(row: GoalRow, index: number, patch: Partial<ProgressItem>) {
  const goals = parseGoalItems(row.goals);
  const items = parseProgressItems(row.progress, Math.max(goals.length, index + 1));
  items[index] = { ...items[index], ...patch };
  row.progress = serializeProgressItems(items);
  if (!row.isDraft) scheduleAutoSave(row);
}

function onGoalsInput(row: GoalRow) {
  if (!row.isDraft) scheduleAutoSave(row);
}

function realignProgressToGoals(row: GoalRow) {
  const goals = parseGoalItems(row.goals);
  const items = parseProgressItems(row.progress, goals.length);
  row.progress = serializeProgressItems(items);
}

function onPlainTextInput(row: GoalRow, _field: ExpandField) {
  if (!row.isDraft) scheduleAutoSave(row);
}

function shouldShowExpandGuide(row: GoalRow, field: ExpandField) {
  if (expandVisible.value) return false;
  // Always show while the field is being edited (draft or inline edit).
  return isFieldEditing(row, field);
}

function onTextFieldBlur(row: GoalRow, field: ExpandField) {
  if (suppressBlurField === field) {
    suppressBlurField = null;
    return;
  }
  if (field === "goals") realignProgressToGoals(row);
  if (row.isDraft) return;
  void finishFieldEdit(row, field);
}

function onProgressFocusOut(row: GoalRow, _event: FocusEvent) {
  if (row.isDraft || expandVisible.value || suppressBlurField === "progress") return;
  window.setTimeout(() => {
    if (expandVisible.value) return;
    const active = document.activeElement;
    if (active?.closest?.(".p-select-overlay, .p-select-list, .p-overlay")) return;
    if (document.querySelector(".p-select-overlay")) return;
    const article = document.querySelector(`article[data-goal-id="${row.id}"]`);
    const wrap = article?.querySelector('[data-field="progress"]');
    if (wrap?.contains(active)) return;
    void finishFieldEdit(row, "progress");
  }, 180);
}

function onDraftRowFocusOut(row: GoalRow) {
  if (!row.isDraft || expandVisible.value) return;
  window.setTimeout(() => {
    if (expandVisible.value) return;
    if (document.querySelector(".p-select-overlay")) return;
    const article = document.querySelector('article[data-draft="1"]');
    if (article?.contains(document.activeElement)) return;
    void maybeSaveDraft(row);
  }, 200);
}

async function openExpandEditor(row: GoalRow, field: ExpandField) {
  suppressBlurField = field;

  if (!row.isDraft && editingCell.value) {
    const prev =
      editingCell.value.rowId === row.id ? row : findRowById(editingCell.value.rowId);
    if (prev && editingCell.value.field !== field) {
      await finishFieldEdit(prev, editingCell.value.field);
    }
  }

  const goalItems = parseGoalItems(row.goals).map((g) => ({ ...g }));
  if (field === "goals") {
    ensureTrailingEmptyGoal(goalItems);
  }
  const filledCount = goalItems.filter((g) => g.text.trim()).length;
  const progressItems = parseProgressItems(row.progress, filledCount).map((p) => ({
    ...p
  }));

  expandState.value = {
    rowId: row.id,
    isDraft: !!row.isDraft,
    field,
    goalItems,
    progressItems,
    plainText: row.nextFocus ?? ""
  };
  expandVisible.value = true;
}

function ensureTrailingEmptyGoal(items: GoalItem[]) {
  const last = items[items.length - 1];
  if (!last || last.text.trim()) {
    items.push({ text: "" });
  }
}

function onExpandGoalInput() {
  const state = expandState.value;
  if (!state || state.field !== "goals") return;
  ensureTrailingEmptyGoal(state.goalItems);
  // Keep progress slots aligned with filled goals only.
  const filled = state.goalItems.filter((g) => g.text.trim()).length;
  while (state.progressItems.length < filled) {
    state.progressItems.push({ status: "", result: "", link: "" });
  }
}

function patchExpandProgressStatus(index: number, value: string | null | undefined) {
  const state = expandState.value;
  if (!state?.progressItems[index]) return;
  state.progressItems[index].status = value ?? "";
}

function removeExpandGoal(index: number) {
  if (!expandState.value) return;
  expandState.value.goalItems.splice(index, 1);
  expandState.value.progressItems.splice(index, 1);
  ensureTrailingEmptyGoal(expandState.value.goalItems);
}

function closeExpandEditor() {
  expandVisible.value = false;
  expandState.value = null;
  suppressBlurField = null;
}

function onExpandHide() {
  expandState.value = null;
  suppressBlurField = null;
}

async function applyExpandEditor() {
  const state = expandState.value;
  if (!state) return;
  const row = resolveExpandRow(state);
  if (!row) {
    closeExpandEditor();
    return;
  }

  if (state.field === "goals") {
    row.goals = serializeGoalItems(state.goalItems);
    const items = parseProgressItems(row.progress, parseGoalItems(row.goals).length);
    row.progress = serializeProgressItems(items);
  } else if (state.field === "progress") {
    const count = parseGoalItems(row.goals).length;
    row.progress = serializeProgressItems(state.progressItems.slice(0, Math.max(count, 0)));
  } else {
    row.nextFocus = state.plainText ?? "";
  }

  closeExpandEditor();
  editingCell.value = null;

  if (row.isDraft) {
    await maybeSaveDraft(row);
    return;
  }
  await persistRow(row, { quiet: false });
}

const defaultPersonnel: PersonnelOption[] = [];

function createEmptyDraft(): GoalRow {
  return {
    id: -1,
    personName: "",
    personAvatar: null,
    goals: "",
    status: "pending",
    progress: "",
    nextFocus: "",
    createdBy: "",
    isDraft: true
  };
}

const draft = ref<GoalRow>(createEmptyDraft());

function snapshotKey(row: GoalRow) {
  return JSON.stringify({
    personName: row.personName ?? "",
    personAvatar: row.personAvatar ?? null,
    goals: row.goals ?? "",
    status: row.status ?? "pending",
    progress: row.progress ?? "",
    nextFocus: row.nextFocus ?? ""
  });
}

function markClean(row: GoalRow) {
  if (row.isDraft) return;
  baselines.set(row.id, snapshotKey(row));
}

function isDirty(row: GoalRow) {
  if (row.isDraft) return false;
  return baselines.get(row.id) !== snapshotKey(row);
}

function clearAutoSaveTimer(rowId: number) {
  const timer = autoSaveTimers.get(rowId);
  if (timer) {
    clearTimeout(timer);
    autoSaveTimers.delete(rowId);
  }
}

function hydrateRow(row: GoalRow): GoalRow {
  const hydrated: GoalRow = {
    ...row,
    goals: row.goals ?? "",
    progress: row.progress ?? "",
    nextFocus: row.nextFocus ?? "",
    createdBy: row.createdBy ?? "",
    isDraft: false
  };
  markClean(hydrated);
  return hydrated;
}

function isBlankDraft(row: Pick<GoalRow, "personName" | "goals" | "progress" | "nextFocus">) {
  return (
    !row.personName?.trim() &&
    !row.goals?.trim() &&
    !row.progress?.trim() &&
    !row.nextFocus?.trim()
  );
}

function resetDraft() {
  draft.value = createEmptyDraft();
}

const STATUS_SEARCH_LABELS: Record<string, string> = {
  pending: "pending",
  in_progress: "on track in_progress",
  done: "done hoàn thành"
};

function rowSearchHaystack(row: GoalRow): string {
  const goalTexts = parseGoalItems(row.goals).map((g) => g.text);
  const progressTexts = parseProgressItems(row.progress, goalTexts.length || 1).flatMap((p) => [
    p.status,
    p.result,
    p.link
  ]);
  return [
    row.personName,
    ...goalTexts,
    ...progressTexts,
    row.nextFocus,
    STATUS_SEARCH_LABELS[row.status] ?? row.status
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

const filteredRows = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return rows.value;
  return rows.value.filter((r) => rowSearchHaystack(r).includes(q));
});

const showDraftInList = computed(() => !searchQuery.value.trim());

const visibleRows = computed(() =>
  showDraftInList.value ? [...filteredRows.value, draft.value] : filteredRows.value
);

const EDIT_ROW_FIELDS: EditField[] = ["person", "goals", "status", "progress", "nextFocus"];

function isFieldEditing(row: GoalRow, field: EditField) {
  if (row.isDraft) return true;
  return editingCell.value?.rowId === row.id && editingCell.value?.field === field;
}

function isRowEditing(row: GoalRow) {
  if (row.isDraft) return true;
  return editingCell.value?.rowId === row.id;
}

function setPerson(row: GoalRow, name: string | null | undefined) {
  const personName = name ?? "";
  const person = personnel.value.find((p) => p.name === personName);
  row.personName = personName;
  row.personAvatar = person?.avatar ?? null;
  if (!row.isDraft) scheduleAutoSave(row);
}

/** Keep current person in the dropdown even if they haven't logged in yet. */
function personOptionsFor(row: GoalRow): PersonnelOption[] {
  const byName = new Map(personnel.value.map((p) => [p.name, p]));
  if (row.personName && !byName.has(row.personName)) {
    byName.set(row.personName, {
      name: row.personName,
      avatar: row.personAvatar
    });
  }
  return Array.from(byName.values());
}

const URL_IN_TEXT_RE = /https?:\/\/[^\s<>"'）】\]]+/gi;

function normalizeHref(text: string): string {
  return text.trim().replace(/[.,;:!?)]+$/, "");
}

function linkLabel(url: string): string {
  try {
    const u = new URL(normalizeHref(url));
    const host = u.hostname.replace(/^www\./, "");
    const path = u.pathname.toLowerCase();
    if (host.includes("docs.google.com") && path.includes("/spreadsheets")) return "Google Sheets";
    if (host.includes("docs.google.com") && path.includes("/document")) return "Google Docs";
    if (host.includes("docs.google.com") && path.includes("/presentation")) return "Google Slides";
    if (host.includes("drive.google.com")) return "Google Drive";
    if (host.includes("notion.so") || host.includes("notion.site")) return "Notion";
    if (host.includes("figma.com")) return "Figma";
    if (host.includes("github.com")) return "GitHub";
    return host;
  } catch {
    const t = url.trim();
    return t.length > 36 ? `${t.slice(0, 33)}…` : t;
  }
}

function progressNoteParts(text: string): Array<{ text: string; href?: string; label?: string }> {
  const parts: Array<{ text: string; href?: string; label?: string }> = [];
  let last = 0;
  const re = new RegExp(URL_IN_TEXT_RE.source, "gi");
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      parts.push({ text: text.slice(last, match.index) });
    }
    const raw = match[0];
    const href = normalizeHref(raw);
    parts.push({ text: raw, href, label: linkLabel(raw) });
    last = match.index + raw.length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts.length ? parts : [{ text }];
}

function findRowById(rowId: number): GoalRow | undefined {
  return rows.value.find((r) => r.id === rowId);
}

function restoreFromBaseline(row: GoalRow) {
  const raw = baselines.get(row.id);
  if (!raw) return;
  try {
    const data = JSON.parse(raw) as {
      personName: string;
      personAvatar: string | null;
      goals: string;
      status: string;
      progress: string;
      nextFocus: string;
    };
    row.personName = data.personName;
    row.personAvatar = data.personAvatar;
    row.goals = data.goals;
    row.status = data.status;
    row.progress = data.progress;
    row.nextFocus = data.nextFocus;
  } catch {
    // ignore invalid baseline
  }
}

async function startFieldEdit(row: GoalRow, field: EditField) {
  if (row.isDraft) return;
  if (isFieldEditing(row, field)) return;

  if (editingCell.value) {
    const prev =
      editingCell.value.rowId === row.id ? row : findRowById(editingCell.value.rowId);
    if (prev) await finishFieldEdit(prev, editingCell.value.field);
  }

  editingCell.value = { rowId: row.id, field };
  await nextTick();
  const el = document.querySelector<HTMLElement>(`article[data-goal-id="${row.id}"]`);
  if (el) focusEditRowField(el, field);
}

async function finishFieldEdit(row: GoalRow, field: EditField) {
  if (row.isDraft) return;
  if (isFieldEditing(row, field)) {
    editingCell.value = null;
  }
  await persistRow(row, { quiet: true });
}

/** Create draft row on server once it has meaningful content. */
async function maybeSaveDraft(row: GoalRow) {
  if (!row.isDraft) return;
  // Ignore stale draft object after a successful save replaced `draft`.
  if (row !== draft.value) return;
  if (isBlankDraft(row)) return;
  // Need at least a person or a goal so we don't create empty noise rows.
  if (!row.personName?.trim() && !row.goals?.trim()) return;
  await saveRow(row);
}

function onEditEscape(row: GoalRow) {
  if (row.isDraft || !editingCell.value || editingCell.value.rowId !== row.id) return;
  restoreFromBaseline(row);
  editingCell.value = null;
}

function onEditRowEnter(event: KeyboardEvent, row: GoalRow) {
  if (!row.isDraft && !isRowEditing(row)) return;

  const target = event.target as HTMLElement | null;
  if (!target) return;
  if (target.closest(".p-select-overlay, .p-select-list, .p-overlay")) return;
  if (target.tagName === "TEXTAREA") return;

  const fieldEl = target.closest<HTMLElement>("[data-field]");
  const field = fieldEl?.dataset.field as EditField | undefined;
  if (!field) return;

  if (!row.isDraft) {
    event.preventDefault();
    void finishFieldEdit(row, field);
    return;
  }

  const idx = EDIT_ROW_FIELDS.indexOf(field);
  if (idx < 0) return;

  if (idx >= EDIT_ROW_FIELDS.length - 1) {
    event.preventDefault();
    void saveRow(row);
    return;
  }

  event.preventDefault();
  const article = event.currentTarget as HTMLElement;
  focusEditRowField(article, EDIT_ROW_FIELDS[idx + 1]);
}

function focusEditRowField(article: HTMLElement, field: string) {
  const wrap = article.querySelector<HTMLElement>(`[data-field="${field}"]`);
  if (!wrap) return;

  if (field === "person" || field === "status") {
    const trigger = wrap.querySelector<HTMLElement>(".p-select");
    trigger?.focus();
    trigger?.click();
    return;
  }

  const input = wrap.querySelector<HTMLElement>("input, textarea");
  input?.focus();
}

function scheduleAutoSave(row: GoalRow) {
  if (row.isDraft) return;
  clearAutoSaveTimer(row.id);
  autoSaveTimers.set(
    row.id,
    setTimeout(() => {
      autoSaveTimers.delete(row.id);
      void persistRow(row, { quiet: true });
    }, AUTO_SAVE_DELAY_MS)
  );
}

async function onStatusChange(row: GoalRow, value: string) {
  row.status = value || "pending";
  if (row.isDraft) return;
  await persistRow(row, { quiet: true });
}

async function persistRow(row: GoalRow, options?: { quiet?: boolean }): Promise<boolean> {
  if (row.isDraft) return false;
  if (!isDirty(row)) return true;
  if (savingIds.value.has(row.id)) {
    scheduleAutoSave(row);
    return false;
  }

  const next = new Set(savingIds.value);
  next.add(row.id);
  savingIds.value = next;

  const sentKey = snapshotKey(row);

  try {
    const res = await fetch(`/api/personal-goals/${row.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders()
      },
      body: JSON.stringify({
        personName: row.personName ?? "",
        personAvatar: row.personAvatar ?? null,
        goals: row.goals ?? "",
        status: row.status ?? "pending",
        progress: row.progress ?? "",
        nextFocus: row.nextFocus ?? ""
      })
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => null);
      throw new Error(errBody?.error || `HTTP ${res.status}`);
    }
    const data = await res.json();
    if (!data?.row) throw new Error("Phản hồi lưu không hợp lệ.");
    const saved = data.row as GoalRow;

    if (snapshotKey(row) === sentKey) {
      row.personName = saved.personName;
      row.personAvatar = saved.personAvatar;
      row.goals = saved.goals;
      row.status = saved.status;
      row.progress = saved.progress;
      row.nextFocus = saved.nextFocus;
      markClean(row);
    }

    if (!options?.quiet) {
      toast.add({
        severity: "success",
        summary: "Đã lưu",
        detail: "Mục tiêu cá nhân đã được lưu.",
        life: 2500
      });
    }
    return true;
  } catch (err) {
    toast.add({
      severity: "error",
      summary: "Lỗi",
      detail: err instanceof Error ? err.message : "Không lưu được mục tiêu cá nhân.",
      life: 3500
    });
    return false;
  } finally {
    const done = new Set(savingIds.value);
    done.delete(row.id);
    savingIds.value = done;
    if (isDirty(row)) scheduleAutoSave(row);
  }
}

function focusDraft() {
  requestAnimationFrame(() => {
    const el = document.querySelector<HTMLElement>(`article[data-draft="1"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    focusEditRowField(el, "person");
  });
}

async function saveRow(row: GoalRow) {
  if (!row.isDraft) {
    if (editingCell.value?.rowId === row.id) {
      await finishFieldEdit(row, editingCell.value.field);
    } else {
      await persistRow(row, { quiet: true });
    }
    return;
  }
  if (savingIds.value.has(row.id)) return;
  if (isBlankDraft(row)) {
    toast.add({
      severity: "warn",
      summary: "Thiếu nội dung",
      detail: "Chọn nhân sự hoặc nhập mục tiêu trước khi lưu.",
      life: 2500
    });
    return;
  }

  const next = new Set(savingIds.value);
  next.add(row.id);
  savingIds.value = next;

  try {
    const res = await fetch("/api/personal-goals", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders()
      },
      body: JSON.stringify({
        weekStart: selectedWeekStart.value,
        personName: row.personName ?? "",
        personAvatar: row.personAvatar ?? null,
        goals: row.goals ?? "",
        status: row.status ?? "pending",
        progress: row.progress ?? "",
        nextFocus: row.nextFocus ?? ""
      })
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => null);
      throw new Error(errBody?.error || `HTTP ${res.status}`);
    }
    const data = await res.json();
    if (!data?.row) throw new Error("Phản hồi lưu không hợp lệ.");

    rows.value.push(hydrateRow(data.row as GoalRow));
    resetDraft();

    toast.add({
      severity: "success",
      summary: "Đã lưu",
      detail: "Đã thêm mục tiêu cá nhân.",
      life: 2500
    });
  } catch (err) {
    toast.add({
      severity: "error",
      summary: "Lỗi",
      detail: err instanceof Error ? err.message : "Không lưu được mục tiêu cá nhân.",
      life: 3500
    });
  } finally {
    const done = new Set(savingIds.value);
    done.delete(row.id);
    savingIds.value = done;
  }
}

function clearDraft() {
  resetDraft();
  toast.add({
    severity: "info",
    summary: "Đã xóa nội dung",
    detail: "Dòng thêm mới đã được làm trống.",
    life: 2000
  });
}

async function deleteRow(row: GoalRow) {
  if (deletingIds.value.has(row.id)) return;

  if (row.isDraft) {
    if (isBlankDraft(row)) {
      focusDraft();
      return;
    }
    confirm.require({
      message: "Xóa nội dung đang nhập trên dòng thêm mới?",
      header: "Xóa nội dung",
      icon: "pi pi-exclamation-triangle",
      rejectProps: { label: "Hủy", severity: "secondary", outlined: true },
      acceptProps: { label: "Xóa", severity: "danger" },
      accept: () => clearDraft()
    });
    return;
  }

  confirm.require({
    message: `Xóa mục tiêu cá nhân của ${row.personName || "nhân sự này"}? Hành động không thể hoàn tác.`,
    header: "Xóa mục tiêu cá nhân",
    icon: "pi pi-exclamation-triangle",
    rejectProps: { label: "Hủy", severity: "secondary", outlined: true },
    acceptProps: { label: "Xóa", severity: "danger" },
    accept: () => {
      void performDelete(row);
    }
  });
}

async function performDelete(row: GoalRow) {
  if (deletingIds.value.has(row.id)) return;

  const next = new Set(deletingIds.value);
  next.add(row.id);
  deletingIds.value = next;

  try {
    const res = await fetch(`/api/personal-goals/${row.id}`, {
      method: "DELETE",
      headers: { ...authHeaders() }
    });
    if (!res.ok) throw new Error("delete failed");

    rows.value = rows.value.filter((r) => r.id !== row.id);
    clearAutoSaveTimer(row.id);
    baselines.delete(row.id);
    if (editingCell.value?.rowId === row.id) editingCell.value = null;

    toast.add({
      severity: "success",
      summary: "Đã xóa",
      detail: "Mục tiêu cá nhân đã được xóa.",
      life: 2500
    });
  } catch {
    toast.add({
      severity: "error",
      summary: "Lỗi",
      detail: "Không xóa được mục tiêu cá nhân.",
      life: 3000
    });
  } finally {
    const done = new Set(deletingIds.value);
    done.delete(row.id);
    deletingIds.value = done;
  }
}

function onWeekRangeUpdate(value: Date | Date[] | (Date | null)[] | null | undefined) {
  const picked = Array.isArray(value) ? value.find((d): d is Date => d instanceof Date) : value;
  if (!picked) return;

  const week = getWeekInfo(picked);
  const sameRange =
    Array.isArray(value) &&
    value[0] instanceof Date &&
    value[1] instanceof Date &&
    value[0].getTime() === week.start.getTime() &&
    value[1].getTime() === week.end.getTime();

  if (!sameRange) {
    weekRange.value = [week.start, week.end];
  }

  if (week.weekStart === selectedWeekStart.value) {
    meta.value = {
      ...meta.value,
      weekStart: week.weekStart,
      weekLabel: week.weekLabel,
      deadlineNote: formatDeadlineNote(week.start)
    };
    return;
  }

  selectedWeekStart.value = week.weekStart;
  void loadBoard(week.weekStart);
}

async function loadBoard(weekStart: string) {
  try {
    const res = await fetch(`/api/personal-goals?week=${encodeURIComponent(weekStart)}`, {
      headers: { ...authHeaders() }
    });
    if (!res.ok) throw new Error("load failed");
    const data = await res.json();

    const week = getWeekInfo(parseIsoDate(data.meta?.weekStart || weekStart) ?? new Date());
    selectedWeekStart.value = week.weekStart;
    weekRange.value = [week.start, week.end];
    meta.value = {
      weekStart: week.weekStart,
      weekLabel: data.meta?.weekLabel || week.weekLabel,
      deadlineNote: formatDeadlineNote(week.start)
    };
    personnel.value =
      Array.isArray(data.personnel) && data.personnel.length > 0
        ? data.personnel
        : defaultPersonnel;
    rows.value = (data.rows ?? []).map((r: GoalRow) => hydrateRow(r));
    resetDraft();
    editingCell.value = null;
    runProgressDeadlineNotify();
  } catch {
    personnel.value = defaultPersonnel;
    rows.value = [];
    resetDraft();
    const week = getWeekInfo(parseIsoDate(weekStart) ?? new Date());
    selectedWeekStart.value = week.weekStart;
    weekRange.value = [week.start, week.end];
    meta.value = {
      weekStart: week.weekStart,
      weekLabel: week.weekLabel,
      deadlineNote: formatDeadlineNote(week.start)
    };
  }
}

onMounted(() => {
  void loadBoard(selectedWeekStart.value);
  void ensureProgressDeadlinePermission();
  runProgressDeadlineNotify();
  deadlineTimer = setInterval(() => {
    nowTick.value = Date.now();
    runProgressDeadlineNotify();
  }, 30_000);
});

onUnmounted(() => {
  for (const timer of autoSaveTimers.values()) clearTimeout(timer);
  autoSaveTimers.clear();
  if (deadlineTimer) {
    clearInterval(deadlineTimer);
    deadlineTimer = null;
  }
});
</script>

<style scoped>
.board-col-headers {
  box-shadow:
    0 1px 0 color-mix(in srgb, var(--color-primary) 8%, transparent),
    0 8px 20px rgb(70 72 212 / 0.06);
  /* Opaque so scrolled rows don't bleed through */
  background: var(--color-surface-container-low, #f3f2f8);
}

.goal-row {
  overflow: hidden;
  scroll-margin-top: 7rem;
}

.goal-cell {
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  overflow-wrap: anywhere;
}

.goal-textarea {
  width: 100%;
  max-width: 100%;
}

.goal-textarea :deep(textarea) {
  width: 100% !important;
  max-width: 100%;
  min-width: 0 !important;
  max-height: 9rem;
  overflow-y: auto !important;
  box-sizing: border-box;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.dl-note {
  color: #c5221f;
  font-size: 10px;
  font-weight: 600;
  line-height: 1.3;
  margin-top: 2px;
}

.deadline-badge {
  transition:
    color 0.25s ease,
    background-color 0.25s ease,
    box-shadow 0.25s ease;
}

.deadline-ok {
  color: var(--color-on-surface-variant);
  background: transparent;
  font-style: italic;
  font-weight: 400;
}

.deadline-soon {
  color: #b06000;
  background: #fef0e6;
  animation: deadline-pulse-soft 2.4s ease-in-out infinite;
}

.deadline-urgent {
  color: #c77700;
  background: #fff3cd;
  box-shadow: 0 0 0 0 rgba(249, 171, 0, 0.45);
  animation: deadline-pulse 1.6s ease-in-out infinite;
}

.deadline-critical {
  color: #93000a;
  background: #ffdad6;
  animation:
    deadline-pulse 1.1s ease-in-out infinite,
    deadline-shake 0.55s ease-in-out infinite;
}

.deadline-overdue {
  color: #fff;
  background: #ba1a1a;
  animation:
    deadline-flash 1.4s ease-in-out infinite,
    deadline-shake 0.7s ease-in-out infinite;
}

@keyframes deadline-pulse-soft {
  0%,
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(176, 96, 0, 0.2);
  }
  50% {
    transform: scale(1.02);
    box-shadow: 0 0 0 6px rgba(176, 96, 0, 0);
  }
}

@keyframes deadline-pulse {
  0%,
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(249, 171, 0, 0.45);
  }
  50% {
    transform: scale(1.04);
    box-shadow: 0 0 0 8px rgba(249, 171, 0, 0);
  }
}

@keyframes deadline-shake {
  0%,
  100% {
    translate: 0 0;
  }
  20% {
    translate: -1.5px 0;
  }
  40% {
    translate: 1.5px 0;
  }
  60% {
    translate: -1px 0;
  }
  80% {
    translate: 1px 0;
  }
}

@keyframes deadline-flash {
  0%,
  100% {
    background: #ba1a1a;
    box-shadow: 0 0 0 0 rgba(186, 26, 26, 0.5);
  }
  50% {
    background: #d93025;
    box-shadow: 0 0 12px 2px rgba(186, 26, 26, 0.35);
  }
}

@media (prefers-reduced-motion: reduce) {
  .deadline-soon,
  .deadline-urgent,
  .deadline-critical,
  .deadline-overdue {
    animation: none;
  }
}

.week-datepicker {
  width: auto;
}

.week-datepicker :deep(.p-datepicker-input),
.week-datepicker :deep(.week-datepicker-input) {
  min-width: 12.5rem;
  border: none;
  background: transparent;
  box-shadow: none;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-primary);
  padding-inline: 0.25rem 0.5rem;
}

.week-datepicker :deep(.p-datepicker),
.week-datepicker :deep(.p-inputwrapper) {
  border: none;
  background: transparent;
  box-shadow: none;
}

.field-edit-actions {
  position: absolute;
  top: 0;
  right: 0;
  display: flex;
  align-items: center;
  gap: 0.125rem;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.group:hover .field-edit-actions,
.group:focus-within .field-edit-actions {
  opacity: 1;
}

.field-edit-btn {
  display: inline-flex;
  height: 1.5rem;
  width: 1.5rem;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  color: var(--color-on-surface-variant);
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}

.field-edit-btn:not(.static-btn) {
  position: absolute;
  top: 0;
  right: 0;
  opacity: 0;
}

.group:hover .field-edit-btn:not(.static-btn),
.group:focus-within .field-edit-btn:not(.static-btn) {
  opacity: 1;
}

.field-edit-btn:hover {
  background: var(--color-surface-container);
  color: var(--color-primary);
}

.expand-hint {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border-radius: 9999px;
  background: color-mix(in srgb, var(--color-primary) 10%, white);
  padding: 0.35rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-primary);
  text-align: left;
  transition:
    background-color 0.15s ease,
    transform 0.15s ease,
    box-shadow 0.15s ease;
}

.expand-hint--guide {
  width: 100%;
  max-width: 100%;
  border-radius: 0.75rem;
  border: 1px dashed color-mix(in srgb, var(--color-primary) 35%, transparent);
  padding: 0.55rem 0.75rem;
  gap: 0.55rem;
  animation: expand-hint-in 0.25s ease;
}

.expand-hint-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 0.1rem;
}

.expand-hint-title {
  font-size: 0.8rem;
  font-weight: 700;
  line-height: 1.2;
}

.expand-hint-sub {
  font-size: 0.68rem;
  font-weight: 500;
  line-height: 1.35;
  color: var(--color-on-surface-variant);
}

.expand-hint:hover {
  background: color-mix(in srgb, var(--color-primary) 16%, white);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgb(70 72 212 / 0.12);
}

@keyframes expand-hint-in {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.field-input {
  width: 100%;
  min-width: 0;
  border-radius: 0.5rem;
  border: 1px solid color-mix(in srgb, var(--color-outline-variant) 80%, transparent);
  background: white;
  padding: 0.4rem 0.65rem;
  font-size: 0.75rem;
  line-height: 1.4;
  color: var(--color-on-surface);
  outline: none;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.field-input:focus {
  border-color: color-mix(in srgb, var(--color-primary) 55%, transparent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 14%, transparent);
}

.field-input::placeholder {
  color: var(--color-outline);
}

.progress-pair-view {
  padding-bottom: 0.35rem;
  border-bottom: 1px dashed color-mix(in srgb, var(--color-outline-variant) 55%, transparent);
}

.progress-pair-view:last-child {
  padding-bottom: 0;
  border-bottom: none;
}

.progress-link-inline {
  color: #0b57d0;
  text-decoration: underline;
  text-underline-offset: 2px;
  word-break: break-all;
}

.progress-link-inline:hover {
  color: #0842a0;
}

.new-goal-row {
  box-shadow: inset 3px 0 0 var(--color-primary);
  animation: row-enter 0.45s ease;
}

@keyframes row-enter {
  from {
    opacity: 0.4;
    background-color: color-mix(in srgb, var(--color-primary) 12%, transparent);
  }
  to {
    opacity: 1;
  }
}
</style>
